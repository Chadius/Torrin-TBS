import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../battle/objectRepository"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../action/template/actionTemplate"
import { ActionEffectSquaddieTemplateService } from "../action/template/actionEffectSquaddieTemplate"
import { Trait, TraitStatusStorageService } from "../trait/traitStatusStorage"
import {
    SquaddieTemplate,
    SquaddieTemplateService,
} from "../campaign/squaddieTemplate"
import { SquaddieIdService } from "../squaddie/id"
import { SquaddieAffiliation } from "../squaddie/squaddieAffiliation"
import { BattleSquaddie, BattleSquaddieService } from "../battle/battleSquaddie"
import {
    BattleSquaddieTeam,
    BattleSquaddieTeamService,
} from "../battle/battleSquaddieTeam"
import * as mocks from "../utils/test/mocks"
import { MockedP5GraphicsBuffer } from "../utils/test/mocks"
import { MissionMap, MissionMapService } from "../missionMap/missionMap"
import { TerrainTileMap } from "../hexMap/terrainTileMap"
import {
    BattlePhaseState,
    BattlePhaseStateService,
} from "../battle/orchestratorComponents/battlePhaseController"
import { BattlePhase } from "../battle/orchestratorComponents/battlePhaseTracker"
import {
    GameEngineState,
    GameEngineStateService,
} from "../gameEngine/gameEngine"
import { ResourceHandler } from "../resource/resourceHandler"
import {
    ActionsThisRound,
    ActionsThisRoundService,
} from "../battle/history/actionsThisRound"
import { BattleOrchestratorStateService } from "../battle/orchestrator/battleOrchestratorState"
import { BattleStateService } from "../battle/orchestrator/battleState"
import { BattleCamera } from "../battle/battleCamera"
import { CampaignService } from "../campaign/campaign"
import { MakeDecisionButton } from "../squaddie/makeDecisionButton"
import { RectAreaService } from "../ui/rectArea"
import { SquaddieTurnService } from "../squaddie/turn"
import { BattlePlayerSquaddieSelector } from "../battle/orchestratorComponents/battlePlayerSquaddieSelector"
import { convertMapCoordinatesToScreenCoordinates } from "../hexMap/convertCoordinates"
import { OrchestratorComponentMouseEventType } from "../battle/orchestrator/battleOrchestratorComponent"
import { BattleOrchestratorMode } from "../battle/orchestrator/battleOrchestrator"
import { BattlePlayerSquaddieTarget } from "../battle/orchestratorComponents/battlePlayerSquaddieTarget"
import { MouseButton } from "../utils/mouseConfig"
import { BattleHUDListener } from "../battle/hud/battleHUD"
import { MessageBoardMessageType } from "../message/messageBoardMessage"

describe("user clicks on an action to consider it", () => {
    let repository: ObjectRepository
    let gameEngineState: GameEngineState

    let playerTeam: BattleSquaddieTeam
    let playerSquaddieTemplate: SquaddieTemplate
    let playerBattleSquaddie: BattleSquaddie

    let attackAction: ActionTemplate

    let resourceHandler: ResourceHandler
    let missionMap: MissionMap

    let attackButton: MakeDecisionButton
    let selector: BattlePlayerSquaddieSelector

    beforeEach(() => {
        repository = ObjectRepositoryService.new()
        attackAction = ActionTemplateService.new({
            id: "action",
            name: "action",
            actionPoints: 2,
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                    }),
                    minimumRange: 1,
                    maximumRange: 1,
                }),
            ],
        })

        playerSquaddieTemplate = SquaddieTemplateService.new({
            squaddieId: SquaddieIdService.new({
                name: "player",
                affiliation: SquaddieAffiliation.PLAYER,
                templateId: "player",
            }),
            actionTemplates: [attackAction],
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
        resourceHandler.areAllResourcesLoaded = jest
            .fn()
            .mockReturnValueOnce(false)
            .mockReturnValueOnce(true)
        resourceHandler.getResource = jest
            .fn()
            .mockReturnValue({ width: 32, height: 32 })

        missionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 "],
            }),
        })
        MissionMapService.addSquaddie(
            missionMap,
            playerSquaddieTemplate.squaddieId.templateId,
            playerBattleSquaddie.battleSquaddieId,
            {
                q: 0,
                r: 0,
            }
        )

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
        const battleHUDListener = new BattleHUDListener("battleHUDListener")
        gameEngineState.messageBoard.addListener(
            battleHUDListener,
            MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE
        )
        gameEngineState.messageBoard.addListener(
            battleHUDListener,
            MessageBoardMessageType.PLAYER_SELECTS_ACTION_THAT_REQUIRES_A_TARGET
        )

        selectSquaddieForTheHUD({
            battleSquaddie: playerBattleSquaddie,
            gameEngineState,
        })

        attackButton =
            gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState.playerCommandState.actionButtons.find(
                (button) => button.actionTemplate.id === attackAction.id
            )

        selector = new BattlePlayerSquaddieSelector()
    })

    it("If the action costs too many ActionPoints, do not select it", () => {
        SquaddieTurnService.spendActionPoints(
            playerBattleSquaddie.squaddieTurn,
            2
        )
        expect(
            playerBattleSquaddie.squaddieTurn.remainingActionPoints
        ).toBeLessThan(attackButton.actionTemplate.actionPoints)

        selectorClicksOnSquaddie(selector, gameEngineState)
        selector.mouseClicked({
            mouseX: RectAreaService.centerX(attackButton.buttonArea),
            mouseY: RectAreaService.centerY(attackButton.buttonArea),
            mouseButton: MouseButton.ACCEPT,
            gameEngineState,
        })

        expect(
            gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState.squaddieSummaryPopoversByType.MAIN
                .battleSquaddieId
        ).toEqual(playerBattleSquaddie.battleSquaddieId)
        expect(
            gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState.playerCommandState.playerSelectedSquaddieAction
        ).toBeFalsy()
    })

    it("ActionsThisRound should mark it as being considered when HUD selects an action", () => {
        selectorClicksOnSquaddie(selector, gameEngineState)
        selector.mouseEventHappened(gameEngineState, {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX: RectAreaService.centerX(attackButton.buttonArea),
            mouseY: RectAreaService.centerY(attackButton.buttonArea),
            mouseButton: MouseButton.ACCEPT,
        })
        expect(
            gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState.playerCommandState.playerSelectedSquaddieAction
        ).toBeTruthy()
        expect(
            gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState.playerCommandState.selectedActionTemplate
        ).toEqual(attackAction)
        expect(
            gameEngineState.battleOrchestratorState.battleState.actionsThisRound
        ).toEqual(
            ActionsThisRoundService.new({
                battleSquaddieId: playerBattleSquaddie.battleSquaddieId,
                startingLocation: { q: 0, r: 0 },
                previewedActionTemplateId: attackAction.name,
                processedActions: [],
            })
        )
    })

    it("Squaddie Selector is Complete and recommends Player HUD Controller phase", () => {
        selectorClicksOnSquaddie(selector, gameEngineState)
        selector.mouseEventHappened(gameEngineState, {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX: RectAreaService.centerX(attackButton.buttonArea),
            mouseY: RectAreaService.centerY(attackButton.buttonArea),
            mouseButton: MouseButton.ACCEPT,
        })

        expect(selector.hasCompleted(gameEngineState)).toBeTruthy()

        const recommendation = selector.recommendStateChanges(gameEngineState)
        expect(recommendation.nextMode).toEqual(
            BattleOrchestratorMode.PLAYER_HUD_CONTROLLER
        )
    })

    it("Squaddie Target should tell Map to highlight targetable squares", () => {
        selectorClicksOnSquaddie(selector, gameEngineState)
        selector.mouseEventHappened(gameEngineState, {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX: RectAreaService.centerX(attackButton.buttonArea),
            mouseY: RectAreaService.centerY(attackButton.buttonArea),
            mouseButton: MouseButton.ACCEPT,
        })
        selector.recommendStateChanges(gameEngineState)
        selector.reset(gameEngineState)

        const targeting = new BattlePlayerSquaddieTarget()
        const graphicsContext = new MockedP5GraphicsBuffer()
        const highlightSpy = jest.spyOn(
            gameEngineState.battleOrchestratorState.battleState.missionMap
                .terrainTileMap,
            "highlightTiles"
        )
        targeting.update(gameEngineState, graphicsContext)

        expect(highlightSpy).toHaveBeenCalled()
        expect(highlightSpy.mock.calls[0][0][0].tiles).toEqual([{ q: 0, r: 1 }])
    })

    it("Hides the action selector", () => {
        selectorClicksOnSquaddie(selector, gameEngineState)
        selector.mouseClicked({
            mouseX: RectAreaService.centerX(attackButton.buttonArea),
            mouseY: RectAreaService.centerY(attackButton.buttonArea),
            mouseButton: MouseButton.ACCEPT,
            gameEngineState,
        })

        expect(
            gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState.showPlayerCommand
        ).toBeFalsy()
    })
})

const getGameEngineState = ({
    resourceHandler,
    missionMap,
    repository,
    teams,
    battlePhaseState,
    actionsThisRound,
}: {
    resourceHandler: ResourceHandler
    missionMap: MissionMap
    repository: ObjectRepository
    teams: BattleSquaddieTeam[]
    battlePhaseState: BattlePhaseState
    actionsThisRound?: ActionsThisRound
}): GameEngineState => {
    return GameEngineStateService.new({
        resourceHandler: resourceHandler,
        battleOrchestratorState: BattleOrchestratorStateService.new({
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

const selectSquaddieForTheHUD = ({
    battleSquaddie,
    gameEngineState,
}: {
    battleSquaddie: BattleSquaddie
    gameEngineState: GameEngineState
}) => {
    gameEngineState.messageBoard.sendMessage({
        type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
        gameEngineState,
        battleSquaddieSelectedId: battleSquaddie.battleSquaddieId,
        selectionMethod: {
            mouse: { x: 0, y: 0 },
        },
    })
}

const selectorClicksOnSquaddie = (
    selector: BattlePlayerSquaddieSelector,
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
}
