import { BattleOrchestratorStateService } from "../orchestrator/battleOrchestratorState"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { SquaddieMovementService } from "../../squaddie/movement"
import {
    ACTION_COMPLETED_WAIT_TIME_MS,
    BattleSquaddieUsesActionOnMap,
} from "./battleSquaddieUsesActionOnMap"
import { BattleStateService } from "../battleState/battleState"
import { OrchestratorUtilities } from "./orchestratorUtils"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import { SquaddieRepositoryService } from "../../utils/test/squaddie"
import {
    BattleAction,
    BattleActionService,
} from "../history/battleAction/battleAction"
import { BattleOrchestratorMode } from "../orchestrator/battleOrchestrator"
import { BattleActionRecorderService } from "../history/battleAction/battleActionRecorder"
import { ArmyAttributesService } from "../../squaddie/armyAttributes"
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import { BattleActionDecisionStepService } from "../actionDecision/battleActionDecisionStep"
import { SummaryHUDStateService } from "../hud/summary/summaryHUD"
import { PlayerCommandStateService } from "../hud/playerCommand/playerCommandHUD"
import { CampaignService } from "../../campaign/campaign"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngineState/gameEngineState"
import { ResourceRepositoryService } from "../../resource/resourceRepository"
import { TestLoadImmediatelyImageLoader } from "../../resource/resourceRepositoryTestUtils"
import { LoadCampaignData } from "../../utils/fileHandling/loadCampaignData"

describe("BattleSquaddieUsesActionOnMap", () => {
    let squaddieRepository: ObjectRepository
    let dateSpy: MockInstance
    let mapAction: BattleSquaddieUsesActionOnMap
    let gameEngineState: GameEngineState
    let messageSpy: MockInstance

    beforeEach(() => {
        squaddieRepository = ObjectRepositoryService.new()
        SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            name: "Nahla",
            templateId: "player_nahla",
            battleId: "player_nahla",
            affiliation: SquaddieAffiliation.PLAYER,
            objectRepository: squaddieRepository,
            attributes: ArmyAttributesService.new({
                movement: SquaddieMovementService.new({
                    movementPerAction: 2,
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.PASS_THROUGH_WALLS]: true,
                    }),
                }),
                maxHitPoints: 0,
            }),
            actionTemplateIds: [],
        })

        SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            name: "Enemy",
            templateId: "enemy_template",
            battleId: "enemy",
            affiliation: SquaddieAffiliation.ENEMY,
            objectRepository: squaddieRepository,
            attributes: ArmyAttributesService.new({}),
            actionTemplateIds: [],
        })

        dateSpy = vi.spyOn(Date, "now").mockImplementation(() => 0)

        mapAction = new BattleSquaddieUsesActionOnMap()

        const loadImmediatelyImageLoader = new TestLoadImmediatelyImageLoader({})
        const resourceRepository = ResourceRepositoryService.new({
            imageLoader: loadImmediatelyImageLoader,
            urls: Object.fromEntries(
                LoadCampaignData.getResourceKeys().map((key) => [key, "url"])
            ),
        })

        gameEngineState = GameEngineStateService.new({
            repository: squaddieRepository,
            resourceRepository,
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    campaignId: "test campaign",
                    missionId: "test mission",
                }),
            }),
        })
        messageSpy = vi.spyOn(gameEngineState.messageBoard, "sendMessage")
    })

    afterEach(() => {
        dateSpy.mockRestore()
        messageSpy.mockRestore()
    })

    it("will wait before ending player turns", () => {
        endTurnForSquaddie(gameEngineState, "player_nahla")
        mapAction.update({
            gameEngineState,
        })
        expect(mapAction.animationCompleteStartTime).not.toBeUndefined()
        expect(mapAction.hasCompleted(gameEngineState)).toBeFalsy()
        dateSpy.mockImplementation(() => ACTION_COMPLETED_WAIT_TIME_MS)

        mapAction.update({
            gameEngineState,
        })
        expect(mapAction.hasCompleted(gameEngineState)).toBeTruthy()
    })

    it("will not wait before ending non player turns", () => {
        endTurnForSquaddie(gameEngineState, "enemy")
        mapAction.update({
            gameEngineState,
        })
        expect(mapAction.hasCompleted(gameEngineState)).toBeTruthy()
    })

    it("will go to player hud controller if there are no more actions queued", () => {
        endTurnForSquaddie(gameEngineState, "player_nahla")
        gameEngineState.battleOrchestratorState.battleState.battleActionRecorder =
            BattleActionRecorderService.new()
        const stateChanges = mapAction.recommendStateChanges(gameEngineState)
        expect(stateChanges!.nextMode).toEqual(
            BattleOrchestratorMode.PLAYER_HUD_CONTROLLER
        )

        mapAction.reset(gameEngineState)
        expect(mapAction.animationCompleteStartTime).toBeUndefined()
        expect(
            OrchestratorUtilities.isSquaddieCurrentlyTakingATurn({
                battleActionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                battleActionRecorder:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder,
            })
        ).toBeFalsy()
    })

    it("sends a message noting the animation is complete", () => {
        endTurnForSquaddie(gameEngineState, "player_nahla")
        mapAction.update({
            gameEngineState,
        })
        dateSpy.mockImplementation(() => ACTION_COMPLETED_WAIT_TIME_MS)
        mapAction.update({
            gameEngineState,
        })
        expect(messageSpy).toBeCalledWith({
            type: MessageBoardMessageType.BATTLE_ACTION_FINISHES_ANIMATION,
            battleActionRecorder:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder,
            repository: gameEngineState.repository,
            missionMap:
                gameEngineState.battleOrchestratorState.battleState.missionMap,
            cache: gameEngineState.battleOrchestratorState.cache,
            battleHUDState:
                gameEngineState.battleOrchestratorState.battleHUDState,
            battleState: gameEngineState.battleOrchestratorState.battleState,
            messageBoard: gameEngineState.messageBoard,
        })
    })

    describe("reset the battle orchestrator component", () => {
        let messageSpy: MockInstance
        beforeEach(() => {
            messageSpy = vi.spyOn(gameEngineState.messageBoard, "sendMessage")
            BattleActionDecisionStepService.setActor({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                battleSquaddieId: "player_nahla",
            })
            gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState =
                SummaryHUDStateService.new()
            gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState.playerCommandState =
                PlayerCommandStateService.new()
            gameEngineState.campaign = CampaignService.default()
            endTurnForSquaddie(gameEngineState, "player_nahla")
            mapAction.update({
                gameEngineState,
            })
            dateSpy.mockImplementation(() => ACTION_COMPLETED_WAIT_TIME_MS)
            mapAction.update({
                gameEngineState,
            })
            mapAction.recommendStateChanges(gameEngineState)
            mapAction.reset(gameEngineState)
        })

        afterEach(() => {
            messageSpy.mockRestore()
        })

        it("clears internal animation timer", () => {
            expect(mapAction.animationCompleteStartTime).toBeUndefined()
        })

        it("knows a message was generated to indicate animation finished", () => {
            expect(messageSpy).toBeCalledWith({
                type: MessageBoardMessageType.BATTLE_ACTION_FINISHES_ANIMATION,
                battleActionRecorder:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder,
                repository: gameEngineState.repository,
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                cache: gameEngineState.battleOrchestratorState.cache,
                battleHUDState:
                    gameEngineState.battleOrchestratorState.battleHUDState,
                battleState:
                    gameEngineState.battleOrchestratorState.battleState,
                messageBoard: gameEngineState.messageBoard,
            })
        })

        it("knows the animation is complete", () => {
            expect(
                BattleActionRecorderService.isAnimationQueueEmpty(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder
                )
            ).toBeFalsy()
        })
    })
})

const endTurnForSquaddie = (
    gameEngineState: GameEngineState,
    actorBattleSquaddieId: string
) => {
    const battleAction: BattleAction = BattleActionService.new({
        actor: { actorBattleSquaddieId },
        action: { isEndTurn: true },
        effect: { endTurn: true },
    })
    BattleActionRecorderService.addReadyToAnimateBattleAction(
        gameEngineState.battleOrchestratorState.battleState
            .battleActionRecorder,
        battleAction
    )
}
