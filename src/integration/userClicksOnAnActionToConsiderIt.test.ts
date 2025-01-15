import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../battle/objectRepository"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../action/template/actionTemplate"
import { ActionEffectTemplateService } from "../action/template/actionEffectTemplate"
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
import { TerrainTileMapService } from "../hexMap/terrainTileMap"
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
import { BattleOrchestratorStateService } from "../battle/orchestrator/battleOrchestratorState"
import { BattleStateService } from "../battle/orchestrator/battleState"
import { BattleCamera } from "../battle/battleCamera"
import { CampaignService } from "../campaign/campaign"
import { MakeDecisionButton } from "../battle/hud/playerActionPanel/makeDecisionButton"
import { RectAreaService } from "../ui/rectArea"
import { SquaddieTurnService } from "../squaddie/turn"
import { BattlePlayerSquaddieSelector } from "../battle/orchestratorComponents/battlePlayerSquaddieSelector"
import { ConvertCoordinateService } from "../hexMap/convertCoordinates"
import { OrchestratorComponentMouseEventType } from "../battle/orchestrator/battleOrchestratorComponent"
import { BattleOrchestratorMode } from "../battle/orchestrator/battleOrchestrator"
import { BattlePlayerSquaddieTarget } from "../battle/orchestratorComponents/battlePlayerSquaddieTarget"
import { MouseButton } from "../utils/mouseConfig"
import { MessageBoardMessageType } from "../message/messageBoardMessage"
import { MapGraphicsLayer } from "../hexMap/mapGraphicsLayer"
import { BattleActionDecisionStepService } from "../battle/actionDecision/battleActionDecisionStep"
import { TargetConstraintsService } from "../action/targetConstraints"
import { ActionResourceCostService } from "../action/actionResourceCost"
import { ActionTilePosition } from "../battle/hud/playerActionPanel/tile/actionTilePosition"
import { SummaryHUDStateService } from "../battle/hud/summary/summaryHUD"
import { GraphicsBuffer } from "../utils/graphics/graphicsRenderer"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { BattleHUDListener } from "../battle/hud/battleHUD/battleHUDListener"

describe("user clicks on an action to consider it", () => {
    let objectRepository: ObjectRepository
    let gameEngineState: GameEngineState
    let mockP5GraphicsContext: MockedP5GraphicsBuffer

    let playerTeam: BattleSquaddieTeam
    let playerSquaddieTemplate: SquaddieTemplate
    let playerBattleSquaddie: BattleSquaddie

    let attackAction: ActionTemplate

    let resourceHandler: ResourceHandler
    let missionMap: MissionMap

    let attackButton: MakeDecisionButton
    let selector: BattlePlayerSquaddieSelector

    beforeEach(() => {
        objectRepository = ObjectRepositoryService.new()
        attackAction = ActionTemplateService.new({
            id: "action",
            name: "action",
            resourceCost: ActionResourceCostService.new({
                actionPoints: 2,
            }),
            targetConstraints: TargetConstraintsService.new({
                minimumRange: 1,
                maximumRange: 1,
            }),
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                    }),
                }),
            ],
        })
        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            attackAction
        )

        playerSquaddieTemplate = SquaddieTemplateService.new({
            squaddieId: SquaddieIdService.new({
                name: "player",
                affiliation: SquaddieAffiliation.PLAYER,
                templateId: "player",
            }),
            actionTemplateIds: [attackAction.id],
        })
        ObjectRepositoryService.addSquaddieTemplate(
            objectRepository,
            playerSquaddieTemplate
        )

        playerBattleSquaddie = BattleSquaddieService.new({
            squaddieTemplateId: playerSquaddieTemplate.squaddieId.templateId,
            battleSquaddieId: "player 0",
        })
        ObjectRepositoryService.addBattleSquaddie(
            objectRepository,
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
                movementCost: ["1 1 "],
            }),
        })
        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: playerSquaddieTemplate.squaddieId.templateId,
            battleSquaddieId: playerBattleSquaddie.battleSquaddieId,
            coordinate: {
                q: 0,
                r: 0,
            },
        })

        gameEngineState = getGameEngineState({
            resourceHandler,
            missionMap,
            repository: objectRepository,
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

        selector = new BattlePlayerSquaddieSelector()
        gameEngineState.messageBoard.addListener(
            selector,
            MessageBoardMessageType.PLAYER_CONFIRMS_DECISION_STEP_ACTOR
        )

        mockP5GraphicsContext = new MockedP5GraphicsBuffer()
        mockP5GraphicsContext.textWidth = vi.fn().mockReturnValue(1)
    })

    it("If the action costs too many ActionPoints, do not select it", () => {
        SquaddieTurnService.spendActionPoints(
            playerBattleSquaddie.squaddieTurn,
            2
        )

        const attackButtonAction =
            ObjectRepositoryService.getActionTemplateById(
                gameEngineState.repository,
                attackAction.id
            )
        expect(
            playerBattleSquaddie.squaddieTurn.remainingActionPoints
        ).toBeLessThan(attackButtonAction.resourceCost.actionPoints)

        selectorClicksOnSquaddie(
            selector,
            gameEngineState,
            mockP5GraphicsContext
        )
        attackButton =
            gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState.playerCommandState.actionButtons.find(
                (button) => button.actionTemplateId === attackAction.id
            )

        selector.mouseClicked({
            mouseX: RectAreaService.centerX(attackButton.buttonIcon.drawArea),
            mouseY: RectAreaService.centerY(attackButton.buttonIcon.drawArea),
            mouseButton: MouseButton.ACCEPT,
            gameEngineState,
        })

        expect(
            gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState.squaddieNameTiles[
                ActionTilePosition.ACTOR_NAME
            ].battleSquaddieId
        ).toEqual(playerBattleSquaddie.battleSquaddieId)
        expect(selector.hasCompleted(gameEngineState)).toBeFalsy()
    })

    it("BattleDecisionStep should mark it as being considered when HUD selects an action", () => {
        selectorClicksOnSquaddie(
            selector,
            gameEngineState,
            mockP5GraphicsContext
        )

        attackButton =
            gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState.playerCommandState.actionButtons.find(
                (button) => button.actionTemplateId === attackAction.id
            )

        selector.mouseEventHappened(gameEngineState, {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX: RectAreaService.centerX(attackButton.buttonIcon.drawArea),
            mouseY: RectAreaService.centerY(attackButton.buttonIcon.drawArea),
            mouseButton: MouseButton.ACCEPT,
        })
        expect(
            gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState.playerCommandState.playerSelectedSquaddieAction
        ).toBeTruthy()
        expect(
            gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState.playerCommandState.selectedActionTemplateId
        ).toEqual(attackAction.id)
        expect(
            BattleActionDecisionStepService.getActor(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep
            ).battleSquaddieId
        ).toEqual(playerBattleSquaddie.battleSquaddieId)
        expect(
            BattleActionDecisionStepService.getAction(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep
            ).actionTemplateId
        ).toEqual(attackAction.id)
        expect(
            BattleActionDecisionStepService.isTargetConsidered(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep
            )
        ).toBeFalsy()
    })

    it("Squaddie Selector is Complete and recommends Player HUD Controller phase", () => {
        selectorClicksOnSquaddie(
            selector,
            gameEngineState,
            mockP5GraphicsContext
        )

        attackButton =
            gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState.playerCommandState.actionButtons.find(
                (button) => button.actionTemplateId === attackAction.id
            )

        selector.mouseEventHappened(gameEngineState, {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX: RectAreaService.centerX(attackButton.buttonIcon.drawArea),
            mouseY: RectAreaService.centerY(attackButton.buttonIcon.drawArea),
            mouseButton: MouseButton.ACCEPT,
        })

        expect(selector.hasCompleted(gameEngineState)).toBeTruthy()

        const recommendation = selector.recommendStateChanges(gameEngineState)
        expect(recommendation.nextMode).toEqual(
            BattleOrchestratorMode.PLAYER_HUD_CONTROLLER
        )
    })

    it("Squaddie Target should tell Map to highlight targetable squares", () => {
        selectorClicksOnSquaddie(
            selector,
            gameEngineState,
            mockP5GraphicsContext
        )

        attackButton =
            gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState.playerCommandState.actionButtons.find(
                (button) => button.actionTemplateId === attackAction.id
            )

        selector.mouseEventHappened(gameEngineState, {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX: RectAreaService.centerX(attackButton.buttonIcon.drawArea),
            mouseY: RectAreaService.centerY(attackButton.buttonIcon.drawArea),
            mouseButton: MouseButton.ACCEPT,
        })
        selector.recommendStateChanges(gameEngineState)
        selector.reset(gameEngineState)

        const targeting = new BattlePlayerSquaddieTarget()
        const graphicsContext = new MockedP5GraphicsBuffer()
        const addGraphicsLayerSpy = vi.spyOn(
            TerrainTileMapService,
            "addGraphicsLayer"
        )
        targeting.update({
            gameEngineState,
            graphicsContext,
            resourceHandler: gameEngineState.resourceHandler,
        })

        expect(addGraphicsLayerSpy).toHaveBeenCalled()
        const addGraphicsLayerSpyLayer: MapGraphicsLayer =
            addGraphicsLayerSpy.mock.calls[0][1]
        expect(
            addGraphicsLayerSpyLayer.highlights.map(
                (highlight) => highlight.coordinate
            )
        ).toEqual([{ q: 0, r: 1 }])
    })

    it("Hides the action selector", () => {
        selectorClicksOnSquaddie(
            selector,
            gameEngineState,
            mockP5GraphicsContext
        )

        attackButton =
            gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState.playerCommandState.actionButtons.find(
                (button) => button.actionTemplateId === attackAction.id
            )

        selector.mouseClicked({
            mouseX: RectAreaService.centerX(attackButton.buttonIcon.drawArea),
            mouseY: RectAreaService.centerY(attackButton.buttonIcon.drawArea),
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

const selectorClicksOnSquaddie = (
    selector: BattlePlayerSquaddieSelector,
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
