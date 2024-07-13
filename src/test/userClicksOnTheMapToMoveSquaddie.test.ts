import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../battle/objectRepository"
import {
    BattleSquaddieTeam,
    BattleSquaddieTeamService,
} from "../battle/battleSquaddieTeam"
import {
    SquaddieTemplate,
    SquaddieTemplateService,
} from "../campaign/squaddieTemplate"
import { BattleSquaddie, BattleSquaddieService } from "../battle/battleSquaddie"
import { BattleSquaddieSelectedHUD } from "../battle/hud/BattleSquaddieSelectedHUD"
import { ResourceHandler } from "../resource/resourceHandler"
import { MissionMap, MissionMapService } from "../missionMap/missionMap"
import { SquaddieIdService } from "../squaddie/id"
import { SquaddieAffiliation } from "../squaddie/squaddieAffiliation"
import * as mocks from "../utils/test/mocks"
import { MockedP5GraphicsBuffer } from "../utils/test/mocks"
import { makeResult } from "../utils/ResultOrError"
import { TerrainTileMap } from "../hexMap/terrainTileMap"
import {
    GameEngineState,
    GameEngineStateService,
} from "../gameEngine/gameEngine"
import {
    BattlePhaseState,
    BattlePhaseStateService,
} from "../battle/orchestratorComponents/battlePhaseController"
import { BattlePhase } from "../battle/orchestratorComponents/battlePhaseTracker"
import { ActionsThisRound } from "../battle/history/actionsThisRound"
import { BattleOrchestratorStateService } from "../battle/orchestrator/battleOrchestratorState"
import { BattleStateService } from "../battle/orchestrator/battleState"
import { BattleCamera } from "../battle/battleCamera"
import { CampaignService } from "../campaign/campaign"
import { BattlePlayerSquaddieSelector } from "../battle/orchestratorComponents/battlePlayerSquaddieSelector"
import { convertMapCoordinatesToScreenCoordinates } from "../hexMap/convertCoordinates"
import { OrchestratorComponentMouseEventType } from "../battle/orchestrator/battleOrchestratorComponent"
import { ArmyAttributesService } from "../squaddie/armyAttributes"
import { SquaddieMovementService } from "../squaddie/movement"
import { ProcessedActionMovementEffectService } from "../action/processed/processedActionMovementEffect"
import { DecidedActionService } from "../action/decided/decidedAction"
import { DecidedActionMovementEffectService } from "../action/decided/decidedActionMovementEffect"
import { ActionEffectMovementTemplateService } from "../action/template/actionEffectMovementTemplate"
import { BattleOrchestratorMode } from "../battle/orchestrator/battleOrchestrator"
import { BattleSquaddieMover } from "../battle/orchestratorComponents/battleSquaddieMover"
import { DrawSquaddieUtilities } from "../battle/animation/drawSquaddie"
import { BattleHUDListener, BattleHUDService } from "../battle/hud/battleHUD"
import { MouseButton } from "../utils/mouseConfig"
import { GraphicsBuffer } from "../utils/graphics/graphicsRenderer"
import { MessageBoardMessageType } from "../message/messageBoardMessage"

describe("user clicks on the map to move", () => {
    let repository: ObjectRepository

    let playerTeam: BattleSquaddieTeam
    let playerSquaddieTemplate: SquaddieTemplate
    let playerBattleSquaddie: BattleSquaddie

    let gameEngineState: GameEngineState

    let selector: BattlePlayerSquaddieSelector
    let battleSquaddieSelectedHUD: BattleSquaddieSelectedHUD
    let missionMap: MissionMap

    let resourceHandler: ResourceHandler

    beforeEach(() => {
        repository = ObjectRepositoryService.new()

        playerSquaddieTemplate = SquaddieTemplateService.new({
            squaddieId: SquaddieIdService.new({
                name: "player",
                affiliation: SquaddieAffiliation.PLAYER,
                templateId: "player",
            }),
            attributes: ArmyAttributesService.new({
                movement: SquaddieMovementService.new({
                    movementPerAction: 1,
                }),
            }),
        })
        ObjectRepositoryService.addSquaddieTemplate(
            repository,
            playerSquaddieTemplate
        )

        playerBattleSquaddie = BattleSquaddieService.new({
            squaddieTemplateId: playerSquaddieTemplate.squaddieId.templateId,
            battleSquaddieId: "player 0",
        })
        ObjectRepositoryService.addBattleSquaddie(
            repository,
            playerBattleSquaddie
        )

        playerTeam = BattleSquaddieTeamService.new({
            name: "player team",
            id: "player",
            affiliation: SquaddieAffiliation.PLAYER,
            battleSquaddieIds: [playerBattleSquaddie.battleSquaddieId],
        })

        battleSquaddieSelectedHUD = new BattleSquaddieSelectedHUD()

        resourceHandler = mocks.mockResourceHandler(
            new MockedP5GraphicsBuffer()
        )
        resourceHandler.areAllResourcesLoaded = jest
            .fn()
            .mockReturnValueOnce(false)
            .mockReturnValueOnce(true)
        resourceHandler.getResource = jest
            .fn()
            .mockReturnValue(makeResult({ width: 1, height: 1 }))

        missionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 1 1 1 ", " x x x x x "],
            }),
        })

        selector = new BattlePlayerSquaddieSelector()
        battleSquaddieSelectedHUD = new BattleSquaddieSelectedHUD()

        gameEngineState = getGameEngineState({
            resourceHandler,
            missionMap,
            repository,
            teams: [playerTeam],
            battlePhaseState: BattlePhaseStateService.new({
                currentAffiliation: BattlePhase.PLAYER,
                turnCount: 0,
            }),
            battleSquaddieSelectedHUD,
        })
        const battleHUDListener = new BattleHUDListener("battleHUDListener")
        gameEngineState.messageBoard.addListener(
            battleHUDListener,
            MessageBoardMessageType.PLAYER_SELECTS_SQUADDIE
        )

        MissionMapService.addSquaddie(
            missionMap,
            playerSquaddieTemplate.squaddieId.templateId,
            playerBattleSquaddie.battleSquaddieId,
            {
                q: 0,
                r: 0,
            }
        )

        selectorAndHUDClickOnSquaddie(
            selector,
            battleSquaddieSelectedHUD,
            playerBattleSquaddie.battleSquaddieId,
            gameEngineState
        )
    })

    describe("Invalid locations", () => {
        it("When user clicks off map", () => {
            selectorClicksOnMapLocation(selector, gameEngineState, -10, 9001)
            commonExpectations()
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState
            ).toBeUndefined()
        })

        it("When user clicks out of range", () => {
            selectorClicksOnMapLocation(selector, gameEngineState, 0, 4)
            commonExpectations()
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.showSummaryHUD
            ).toBeTruthy()
        })

        it("When user clicks in range but on invalid terrain", () => {
            selectorClicksOnMapLocation(selector, gameEngineState, 1, 0)
            commonExpectations()
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.showSummaryHUD
            ).toBeTruthy()
        })

        it("When User clicks in range on another squaddie", () => {
            const anotherPlayer = BattleSquaddieService.new({
                squaddieTemplateId:
                    playerSquaddieTemplate.squaddieId.templateId,
                battleSquaddieId: "another player",
            })
            ObjectRepositoryService.addBattleSquaddie(repository, anotherPlayer)
            MissionMapService.addSquaddie(
                missionMap,
                anotherPlayer.squaddieTemplateId,
                anotherPlayer.battleSquaddieId,
                {
                    q: 0,
                    r: 2,
                }
            )
            selectorClicksOnMapLocation(selector, gameEngineState, 0, 2)
            commonExpectations()
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.showSummaryHUD
            ).toBeTruthy()
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.summaryPanelLeft.battleSquaddieId
            ).toEqual(anotherPlayer.battleSquaddieId)
        })

        const commonExpectations = () => {
            const battleState =
                gameEngineState.battleOrchestratorState.battleState
            expect(battleState.actionsThisRound).toBeUndefined()
            expect(selector.hasCompleted(gameEngineState)).toBeFalsy()
        }
    })

    describe("When user clicks on map to make a legal move", () => {
        beforeEach(() => {
            selectorClicksOnMapLocation(selector, gameEngineState, 0, 3)
        })

        it("Squaddie Selector will create a new route", () => {
            expect(
                gameEngineState.battleOrchestratorState.battleState
                    .squaddieMovePath
            ).not.toBeUndefined()
            const squaddieMovePath =
                gameEngineState.battleOrchestratorState.battleState
                    .squaddieMovePath
            expect(squaddieMovePath.destination).toEqual({ q: 0, r: 3 })
        })

        it("Squaddie Selector will create a Processed Action describing the movement, for the given squaddie, giving it to ActionsThisRound", () => {
            const actionsThisRound =
                gameEngineState.battleOrchestratorState.battleState
                    .actionsThisRound
            expect(actionsThisRound.startingLocation).toEqual({ q: 0, r: 0 })
            expect(actionsThisRound.processedActions).toHaveLength(1)
            expect(actionsThisRound.processedActionEffectIteratorIndex).toEqual(
                0
            )

            const decidedActionMovementEffect =
                DecidedActionMovementEffectService.new({
                    destination: { q: 0, r: 3 },
                    template: ActionEffectMovementTemplateService.new({}),
                })
            expect(actionsThisRound.processedActions[0].decidedAction).toEqual(
                DecidedActionService.new({
                    actionPointCost: 3,
                    battleSquaddieId: playerBattleSquaddie.battleSquaddieId,
                    actionTemplateName: "Move",
                    actionEffects: [decidedActionMovementEffect],
                })
            )

            expect(
                actionsThisRound.processedActions[0].processedActionEffects
            ).toHaveLength(1)
            expect(
                actionsThisRound.processedActions[0].processedActionEffects[0]
            ).toEqual(
                ProcessedActionMovementEffectService.new({
                    decidedActionEffect: decidedActionMovementEffect,
                })
            )
        })

        it("Squaddie spends the action points moving and moves to the new location", () => {
            expect(
                playerBattleSquaddie.squaddieTurn.remainingActionPoints
            ).toEqual(0)

            const { mapLocation } = missionMap.getSquaddieByBattleId(
                playerBattleSquaddie.battleSquaddieId
            )
            expect(mapLocation).toEqual({ q: 0, r: 3 })
        })

        it("Squaddie Selector is complete", () => {
            expect(selector.hasCompleted(gameEngineState)).toBeTruthy()
        })

        it("Squaddie Selector suggests the Player HUD Controller phase next", () => {
            const recommendation =
                selector.recommendStateChanges(gameEngineState)
            expect(recommendation.nextMode).toEqual(
                BattleOrchestratorMode.PLAYER_HUD_CONTROLLER
            )
        })
    })

    describe("Squaddie Mover knows to move over", () => {
        let mover: BattleSquaddieMover
        let graphicsContext: GraphicsBuffer
        let moveSquaddieAlongPathSpy: jest.SpyInstance

        beforeEach(() => {
            selectorClicksOnMapLocation(selector, gameEngineState, 0, 3)
            mover = new BattleSquaddieMover()
            graphicsContext = new MockedP5GraphicsBuffer()
            moveSquaddieAlongPathSpy = jest.spyOn(
                DrawSquaddieUtilities,
                "moveSquaddieAlongPath"
            )
        })

        it("mover tries to move the squaddie icon", () => {
            expect(mover.hasCompleted(gameEngineState)).toBeFalsy()
            jest.spyOn(Date, "now").mockImplementation(() => 1)
            mover.update(gameEngineState, graphicsContext)
            expect(
                moveSquaddieAlongPathSpy.mock.calls[0][0].battleSquaddie
                    .battleSquaddieId
            ).toEqual(playerBattleSquaddie.battleSquaddieId)
        })
    })
})

const getGameEngineState = ({
    resourceHandler,
    missionMap,
    repository,
    teams,
    battlePhaseState,
    actionsThisRound,
    battleSquaddieSelectedHUD,
}: {
    resourceHandler: ResourceHandler
    missionMap: MissionMap
    repository: ObjectRepository
    teams: BattleSquaddieTeam[]
    battlePhaseState: BattlePhaseState
    actionsThisRound?: ActionsThisRound
    battleSquaddieSelectedHUD: BattleSquaddieSelectedHUD
}): GameEngineState => {
    return GameEngineStateService.new({
        resourceHandler: resourceHandler,
        battleOrchestratorState: BattleOrchestratorStateService.new({
            battleHUD: BattleHUDService.new({
                battleSquaddieSelectedHUD,
            }),
            battleState: BattleStateService.newBattleState({
                missionId: "test mission",
                campaignId: "test campaign",
                missionMap,
                camera: new BattleCamera(0, 0),
                teams,
                battlePhaseState,
                actionsThisRound,
            }),
        }),
        repository,
        campaign: CampaignService.default({}),
    })
}

const selectorAndHUDClickOnSquaddie = (
    selector: BattlePlayerSquaddieSelector,
    battleSquaddieSelectedHUD: BattleSquaddieSelectedHUD,
    battleSquaddieId: string,
    gameEngineState: GameEngineState
) => {
    let [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(
        0,
        0,
        ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates()
    )
    selector.mouseEventHappened(gameEngineState, {
        eventType: OrchestratorComponentMouseEventType.CLICKED,
        mouseX,
        mouseY,
        mouseButton: MouseButton.ACCEPT,
    })
    battleSquaddieSelectedHUD.selectSquaddieAndDrawWindow({
        battleId: battleSquaddieId,
        gameEngineState: gameEngineState,
        repositionWindow: { mouseX: 0, mouseY: 0 },
    })
}

const selectorClicksOnMapLocation = (
    selector: BattlePlayerSquaddieSelector,
    gameEngineState: GameEngineState,
    q: number,
    r: number
) => {
    let [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(
        q,
        r,
        ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates()
    )
    selector.mouseEventHappened(gameEngineState, {
        eventType: OrchestratorComponentMouseEventType.CLICKED,
        mouseX,
        mouseY,
        mouseButton: MouseButton.ACCEPT,
    })
}
