import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent,
} from "../orchestrator/battleOrchestratorComponent"
import { DrawSquaddieUtilities } from "../animation/drawSquaddie"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { OrchestratorUtilities } from "./orchestratorUtils"
import { UIControlSettings } from "../orchestrator/uiControlSettings"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { ObjectRepositoryService } from "../objectRepository"
import { ActionsThisRoundService } from "../history/actionsThisRound"
import { ActionComponentCalculator } from "../actionDecision/actionComponentCalculator"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import { BattleActionQueueService } from "../history/battleActionQueue"
import { BattleActionService } from "../history/battleAction"

export const ACTION_COMPLETED_WAIT_TIME_MS = 500

export class BattleSquaddieUsesActionOnMap
    implements BattleOrchestratorComponent
{
    animationCompleteStartTime?: number

    constructor() {
        this.animationCompleteStartTime = undefined
    }

    hasCompleted(state: GameEngineState): boolean {
        return animationTimeHasExpired(this.animationCompleteStartTime)
    }

    mouseEventHappened(
        state: GameEngineState,
        event: OrchestratorComponentMouseEvent
    ): void {
        // Required by inheritance
    }

    keyEventHappened(
        state: GameEngineState,
        event: OrchestratorComponentKeyEvent
    ): void {
        // Required by inheritance
    }

    uiControlSettings(state: GameEngineState): UIControlSettings {
        return new UIControlSettings({
            displayMap: true,
            scrollCamera: false,
            pauseTimer: true,
        })
    }

    recommendStateChanges(
        gameEngineState: GameEngineState
    ): BattleOrchestratorChanges | undefined {
        ActionsThisRoundService.nextProcessedActionEffectToShow(
            gameEngineState.battleOrchestratorState.battleState.actionsThisRound
        )
        OrchestratorUtilities.clearActionsThisRoundIfSquaddieCannotAct(
            gameEngineState
        )
        OrchestratorUtilities.generateMessagesIfThePlayerCanActWithANewSquaddie(
            gameEngineState
        )
        const nextMode =
            ActionComponentCalculator.getNextModeBasedOnBattleActionQueue(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionQueue
            )

        OrchestratorUtilities.drawOrResetHUDBasedOnSquaddieTurnAndAffiliation(
            gameEngineState
        )
        OrchestratorUtilities.drawPlayableSquaddieReach(gameEngineState)

        return {
            nextMode,
            displayMap: true,
            checkMissionObjectives: true,
        }
    }

    reset(gameEngineState: GameEngineState): void {
        this.animationCompleteStartTime = undefined
    }

    update(
        gameEngineState: GameEngineState,
        graphicsContext: GraphicsBuffer
    ): void {
        if (this.animationCompleteStartTime === undefined) {
            this.animationCompleteStartTime = Date.now()
        }

        if (!animationTimeHasExpired(this.animationCompleteStartTime)) {
            return
        }

        BattleActionService.setAnimationCompleted({
            battleAction: BattleActionQueueService.peek(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionQueue
            ),
            animationCompleted: true,
        })

        const battleSquaddieId = BattleActionQueueService.peek(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionQueue
        ).actor.actorBattleSquaddieId

        const { battleSquaddie, squaddieTemplate } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                gameEngineState.repository,
                battleSquaddieId
            )
        )
        DrawSquaddieUtilities.highlightPlayableSquaddieReachIfTheyCanAct({
            battleSquaddie,
            squaddieTemplate,
            missionMap:
                gameEngineState.battleOrchestratorState.battleState.missionMap,
            repository: gameEngineState.repository,
            campaign: gameEngineState.campaign,
        })
        DrawSquaddieUtilities.tintSquaddieMapIconIfTheyCannotAct(
            battleSquaddie,
            squaddieTemplate,
            gameEngineState.repository
        )

        gameEngineState.messageBoard.sendMessage({
            type: MessageBoardMessageType.BATTLE_ACTION_FINISHES_ANIMATION,
            gameEngineState,
        })
    }
}

const animationTimeHasExpired = (animationCompleteStartTime: number) =>
    animationCompleteStartTime !== undefined &&
    Date.now() - animationCompleteStartTime >= ACTION_COMPLETED_WAIT_TIME_MS
