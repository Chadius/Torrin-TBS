import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent,
} from "../orchestrator/battleOrchestratorComponent"
import { OrchestratorUtilities } from "./orchestratorUtils"
import { UIControlSettings } from "../orchestrator/uiControlSettings"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { ActionComponentCalculator } from "../actionDecision/actionComponentCalculator"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import { BattleActionService } from "../history/battleAction/battleAction"
import { BattleActionRecorderService } from "../history/battleAction/battleActionRecorder"

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
        OrchestratorUtilities.generateMessagesIfThePlayerCanActWithANewSquaddie(
            gameEngineState
        )
        const nextMode =
            ActionComponentCalculator.getNextModeBasedOnBattleActionRecorder(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder
            )

        OrchestratorUtilities.messageAndHighlightPlayableSquaddieTakingATurn({
            gameEngineState,
        })

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
            battleAction: BattleActionRecorderService.peekAtAnimationQueue(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder
            ),
            animationCompleted: true,
        })

        gameEngineState.messageBoard.sendMessage({
            type: MessageBoardMessageType.BATTLE_ACTION_FINISHES_ANIMATION,
            gameEngineState,
            graphicsContext,
            resourceHandler: gameEngineState.resourceHandler,
        })
    }
}

const animationTimeHasExpired = (animationCompleteStartTime: number) =>
    animationCompleteStartTime !== undefined &&
    Date.now() - animationCompleteStartTime >= ACTION_COMPLETED_WAIT_TIME_MS
