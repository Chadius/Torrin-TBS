import { OrchestratorComponentMouseEvent } from "../orchestrator/battleOrchestratorComponent"
import { SquaddieActionAnimator } from "./squaddieActionAnimator"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { BattleActionService } from "../history/battleAction"
import { BattleActionQueueService } from "../history/battleActionQueue"

export class DefaultSquaddieActionAnimator implements SquaddieActionAnimator {
    hasCompleted(state: GameEngineState): boolean {
        return true
    }

    mouseEventHappened(
        state: GameEngineState,
        mouseEvent: OrchestratorComponentMouseEvent
    ): void {
        // Required by inheritance
    }

    reset(gameEngineState: GameEngineState): void {
        BattleActionService.setAnimationCompleted({
            battleAction: BattleActionQueueService.peek(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionQueue
            ),
            animationCompleted: true,
        })
    }

    start(state: GameEngineState): void {
        // Required by inheritance
    }

    update(state: GameEngineState, graphics: GraphicsBuffer): void {
        // Required by inheritance
    }
}
