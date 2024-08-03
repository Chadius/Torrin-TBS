import { OrchestratorComponentMouseEvent } from "../orchestrator/battleOrchestratorComponent"
import { SquaddieActionAnimator } from "./squaddieActionAnimator"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { BattleActionDecisionStepService } from "../actionDecision/battleActionDecisionStep"

export class DefaultSquaddieActionAnimator implements SquaddieActionAnimator {
    hasCompleted(state: GameEngineState): boolean {
        return true
    }

    mouseEventHappened(
        state: GameEngineState,
        mouseEvent: OrchestratorComponentMouseEvent
    ): void {}

    reset(gameEngineState: GameEngineState): void {
        BattleActionDecisionStepService.setAnimationCompleted({
            actionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .playerBattleActionBuilderState,
            animationCompleted: true,
        })
    }

    start(state: GameEngineState): void {}

    update(state: GameEngineState, graphics: GraphicsBuffer): void {}
}
