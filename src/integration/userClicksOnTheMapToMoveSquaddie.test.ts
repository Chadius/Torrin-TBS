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
import { ResourceHandler } from "../resource/resourceHandler"
import { MissionMap, MissionMapService } from "../missionMap/missionMap"
import { SquaddieIdService } from "../squaddie/id"
import { SquaddieAffiliation } from "../squaddie/squaddieAffiliation"
import * as mocks from "../utils/test/mocks"
import { MockedP5GraphicsBuffer } from "../utils/test/mocks"
import { TerrainTileMapService } from "../hexMap/terrainTileMap"
import {
    GameEngineState,
    GameEngineStateService,
} from "../gameEngine/gameEngine"
import {
    BattlePhaseState,
    BattlePhaseStateService,
} from "../battle/orchestratorComponents/battlePhaseController"
import { BattlePhase } from "../battle/orchestratorComponents/battlePhaseTracker"
import { BattleOrchestratorStateService } from "../battle/orchestrator/battleOrchestratorState"
import { BattleStateService } from "../battle/orchestrator/battleState"
import { BattleCamera } from "../battle/battleCamera"
import { CampaignService } from "../campaign/campaign"
import { BattlePlayerSquaddieSelector } from "../battle/orchestratorComponents/battlePlayerSquaddieSelector"
import { ConvertCoordinateService } from "../hexMap/convertCoordinates"
import { OrchestratorComponentMouseEventType } from "../battle/orchestrator/battleOrchestratorComponent"
import { ArmyAttributesService } from "../squaddie/armyAttributes"
import { SquaddieMovementService } from "../squaddie/movement"
import { BattleOrchestratorMode } from "../battle/orchestrator/battleOrchestrator"
import { BattleSquaddieMover } from "../battle/orchestratorComponents/battleSquaddieMover"
import { DrawSquaddieUtilities } from "../battle/animation/drawSquaddie"
import { BattleHUDService } from "../battle/hud/battleHUD/battleHUD"
import { MouseButton } from "../utils/mouseConfig"
import { GraphicsBuffer } from "../utils/graphics/graphicsRenderer"
import { MessageBoardMessageType } from "../message/messageBoardMessage"
import {
    BattleActionDecisionStep,
    BattleActionDecisionStepService,
} from "../battle/actionDecision/battleActionDecisionStep"
import { BattleActionService } from "../battle/history/battleAction/battleAction"
import { BattleActionRecorderService } from "../battle/history/battleAction/battleActionRecorder"
import { ActionTilePosition } from "../battle/hud/playerActionPanel/tile/actionTilePosition"
import { SummaryHUDStateService } from "../battle/hud/summary/summaryHUD"
import { beforeEach, describe, expect, it, MockInstance, vi } from "vitest"
import { BattleHUDListener } from "../battle/hud/battleHUD/battleHUDListener"

describe("user clicks on the map to move", () => {
    let repository: ObjectRepository

    let playerTeam: BattleSquaddieTeam
    let playerSquaddieTemplate: SquaddieTemplate
    let playerBattleSquaddie: BattleSquaddie

    let gameEngineState: GameEngineState

    let selector: BattlePlayerSquaddieSelector
    let missionMap: MissionMap

    let resourceHandler: ResourceHandler
    let mockP5GraphicsContext: MockedP5GraphicsBuffer

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

        resourceHandler = mocks.mockResourceHandler(
            new MockedP5GraphicsBuffer()
        )
        resourceHandler.areAllResourcesLoaded = vi
            .fn()
            .mockReturnValueOnce(false)
            .mockReturnValueOnce(true)
        resourceHandler.getResource = vi
            .fn()
            .mockReturnValue({ width: 32, height: 32 })

        missionMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 1 1 1 ", " x x x x x ", "  x x 1 x x "],
            }),
        })

        gameEngineState = getGameEngineState({
            resourceHandler,
            missionMap,
            repository,
            teams: [playerTeam],
            battlePhaseState: BattlePhaseStateService.new({
                currentAffiliation: BattlePhase.PLAYER,
                turnCount: 0,
            }),
        })
        gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState =
            SummaryHUDStateService.new({})

        selector = new BattlePlayerSquaddieSelector()
        gameEngineState.messageBoard.addListener(
            selector,
            MessageBoardMessageType.PLAYER_CONFIRMS_DECISION_STEP_ACTOR
        )

        const battleHUDListener = new BattleHUDListener("battleHUDListener")
        gameEngineState.messageBoard.addListener(
            battleHUDListener,
            MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE
        )
        gameEngineState.messageBoard.addListener(
            battleHUDListener,
            MessageBoardMessageType.PLAYER_CANCELS_SQUADDIE_SELECTION
        )
        gameEngineState.messageBoard.addListener(
            battleHUDListener,
            MessageBoardMessageType.MOVE_SQUADDIE_TO_COORDINATE
        )

        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: playerSquaddieTemplate.squaddieId.templateId,
            battleSquaddieId: playerBattleSquaddie.battleSquaddieId,
            coordinate: {
                q: 0,
                r: 0,
            },
        })

        mockP5GraphicsContext = new MockedP5GraphicsBuffer()
        mockP5GraphicsContext.textWidth = vi.fn().mockReturnValue(1)

        selectorAndHUDClickOnSquaddie(
            selector,
            playerBattleSquaddie.battleSquaddieId,
            gameEngineState,
            mockP5GraphicsContext
        )
    })

    describe("Invalid coordinates", () => {
        it("When user clicks off map", () => {
            selectorClicksOnMapCoordinate(
                selector,
                gameEngineState,
                -10,
                9001,
                mockP5GraphicsContext
            )
            expectNoActionWasMadeAndSelectorIsComplete()
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState
            ).toBeUndefined()
        })

        it("When user clicks out of range", () => {
            selectorClicksOnMapCoordinate(
                selector,
                gameEngineState,
                0,
                4,
                mockP5GraphicsContext
            )
            expectNoActionWasMadeAndSelectorIsComplete()
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.squaddieNameTiles[
                    ActionTilePosition.ACTOR_NAME
                ]
            ).toBeTruthy()
        })

        it("When user clicks in range but on invalid terrain", () => {
            selectorClicksOnMapCoordinate(
                selector,
                gameEngineState,
                1,
                0,
                mockP5GraphicsContext
            )
            expectNoActionWasMadeAndSelectorIsComplete()
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.squaddieNameTiles[
                    ActionTilePosition.ACTOR_NAME
                ]
            ).toBeTruthy()
        })

        it("When User clicks out of range on another squaddie", () => {
            const anotherPlayer = BattleSquaddieService.new({
                squaddieTemplateId:
                    playerSquaddieTemplate.squaddieId.templateId,
                battleSquaddieId: "another player",
            })
            ObjectRepositoryService.addBattleSquaddie(repository, anotherPlayer)
            MissionMapService.addSquaddie({
                missionMap,
                squaddieTemplateId: anotherPlayer.squaddieTemplateId,
                battleSquaddieId: anotherPlayer.battleSquaddieId,
                coordinate: {
                    q: 2,
                    r: 2,
                },
            })
            selectorClicksOnMapCoordinate(
                selector,
                gameEngineState,
                2,
                2,
                mockP5GraphicsContext
            )
            expectNoActionWasMadeAndSelectorIsComplete()

            SummaryHUDStateService.draw({
                summaryHUDState:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState,
                gameEngineState,
                resourceHandler: gameEngineState.resourceHandler,
                graphicsBuffer: mockP5GraphicsContext,
            })
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.squaddieNameTiles[
                    ActionTilePosition.ACTOR_NAME
                ].battleSquaddieId
            ).toEqual(anotherPlayer.battleSquaddieId)
        })

        const expectNoActionWasMadeAndSelectorIsComplete = () => {
            expect(
                BattleActionDecisionStepService.getAction(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep
                )
            ).toBeUndefined()
            expect(selector.hasCompleted(gameEngineState)).toBeFalsy()
        }
    })

    describe("When user clicks on map to make a legal move", () => {
        beforeEach(() => {
            const playerBattleSquaddie2 = BattleSquaddieService.new({
                squaddieTemplateId:
                    playerSquaddieTemplate.squaddieId.templateId,
                battleSquaddieId: "player 2",
            })
            ObjectRepositoryService.addBattleSquaddie(
                repository,
                playerBattleSquaddie2
            )
            MissionMapService.addSquaddie({
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                battleSquaddieId: playerBattleSquaddie2.battleSquaddieId,
                squaddieTemplateId: playerBattleSquaddie2.squaddieTemplateId,
                coordinate: { q: 0, r: 1 },
            })
            BattleSquaddieTeamService.addBattleSquaddieIds(
                gameEngineState.battleOrchestratorState.battleState.teams[0],
                [playerBattleSquaddie2.battleSquaddieId]
            )

            selectorClicksOnMapCoordinate(
                selector,
                gameEngineState,
                0,
                3,
                mockP5GraphicsContext
            )
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

        it("Squaddie Selector will create a Battle Action describing the movement, for the given squaddie", () => {
            const movementStep: BattleActionDecisionStep =
                BattleActionDecisionStepService.new()
            BattleActionDecisionStepService.setActor({
                actionDecisionStep: movementStep,
                battleSquaddieId: playerBattleSquaddie.battleSquaddieId,
            })
            BattleActionDecisionStepService.addAction({
                actionDecisionStep: movementStep,
                movement: true,
            })
            BattleActionDecisionStepService.setConfirmedTarget({
                actionDecisionStep: movementStep,
                targetCoordinate: { q: 0, r: 3 },
            })

            expect(
                BattleActionRecorderService.peekAtAnimationQueue(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder
                )
            ).toEqual(
                BattleActionService.new({
                    actor: {
                        actorBattleSquaddieId:
                            playerBattleSquaddie.battleSquaddieId,
                    },
                    action: { isMovement: true },
                    effect: {
                        movement: {
                            startCoordinate: { q: 0, r: 0 },
                            endCoordinate: { q: 0, r: 3 },
                        },
                    },
                })
            )
        })

        it("Squaddie spends the action points moving and moves to the new coordinate", () => {
            expect(
                playerBattleSquaddie.squaddieTurn.remainingActionPoints
            ).toEqual(0)

            const { mapCoordinate } = MissionMapService.getByBattleSquaddieId(
                missionMap,
                playerBattleSquaddie.battleSquaddieId
            )
            expect(mapCoordinate).toEqual({ q: 0, r: 3 })
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
        let moveSquaddieAlongPathSpy: MockInstance

        beforeEach(() => {
            selectorClicksOnMapCoordinate(
                selector,
                gameEngineState,
                0,
                3,
                mockP5GraphicsContext
            )
            mover = new BattleSquaddieMover()
            graphicsContext = new MockedP5GraphicsBuffer()
            moveSquaddieAlongPathSpy = vi.spyOn(
                DrawSquaddieUtilities,
                "moveSquaddieAlongPath"
            )
        })

        it("mover tries to move the squaddie icon", () => {
            expect(mover.hasCompleted(gameEngineState)).toBeFalsy()
            vi.spyOn(Date, "now").mockImplementation(() => 1)
            let getImageUISpy: MockInstance
            getImageUISpy = vi
                .spyOn(ObjectRepositoryService, "getImageUIByBattleSquaddieId")
                .mockReturnValue(undefined)
            mover.update({
                gameEngineState,
                graphicsContext,
                resourceHandler: gameEngineState.resourceHandler,
            })
            expect(
                moveSquaddieAlongPathSpy.mock.calls[0][0].battleSquaddie
                    .battleSquaddieId
            ).toEqual(playerBattleSquaddie.battleSquaddieId)
            getImageUISpy.mockRestore()
        })
    })
})

const getGameEngineState = ({
    resourceHandler,
    missionMap,
    repository,
    teams,
    battlePhaseState,
}: {
    resourceHandler: ResourceHandler
    missionMap: MissionMap
    repository: ObjectRepository
    teams: BattleSquaddieTeam[]
    battlePhaseState: BattlePhaseState
}): GameEngineState => {
    return GameEngineStateService.new({
        resourceHandler: resourceHandler,
        battleOrchestratorState: BattleOrchestratorStateService.new({
            battleHUD: BattleHUDService.new({}),
            battleState: BattleStateService.newBattleState({
                missionId: "test mission",
                campaignId: "test campaign",
                missionMap,
                camera: new BattleCamera(0, 0),
                teams,
                battlePhaseState,
            }),
        }),
        repository,
        campaign: CampaignService.default(),
    })
}

const selectorAndHUDClickOnSquaddie = (
    selector: BattlePlayerSquaddieSelector,
    battleSquaddieId: string,
    gameEngineState: GameEngineState,
    graphicsContext: GraphicsBuffer
) => {
    let { screenX: mouseX, screenY: mouseY } =
        ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
            q: 0,
            r: 0,
            ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates(),
        })
    selector.mouseEventHappened(gameEngineState, {
        eventType: OrchestratorComponentMouseEventType.CLICKED,
        mouseX,
        mouseY,
        mouseButton: MouseButton.ACCEPT,
    })

    SummaryHUDStateService.draw({
        summaryHUDState:
            gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState,
        gameEngineState,
        resourceHandler: gameEngineState.resourceHandler,
        graphicsBuffer: graphicsContext,
    })
}

const selectorClicksOnMapCoordinate = (
    selector: BattlePlayerSquaddieSelector,
    gameEngineState: GameEngineState,
    q: number,
    r: number,
    graphicsContext: GraphicsBuffer
) => {
    let { screenX: mouseX, screenY: mouseY } =
        ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
            q,
            r,
            ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates(),
        })
    selector.mouseEventHappened(gameEngineState, {
        eventType: OrchestratorComponentMouseEventType.CLICKED,
        mouseX,
        mouseY,
        mouseButton: MouseButton.ACCEPT,
    })
}
