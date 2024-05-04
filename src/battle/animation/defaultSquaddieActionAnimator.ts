import {OrchestratorComponentMouseEvent} from "../orchestrator/battleOrchestratorComponent";
import {SquaddieActionAnimator} from "./squaddieActionAnimator";
import {GraphicsContext} from "../../utils/graphics/graphicsContext";
import {GameEngineState} from "../../gameEngine/gameEngine";
import {PlayerBattleActionBuilderStateService} from "../actionBuilder/playerBattleActionBuilderState";

export class DefaultSquaddieActionAnimator implements SquaddieActionAnimator {
    hasCompleted(state: GameEngineState): boolean {
        return true;
    }

    mouseEventHappened(state: GameEngineState, mouseEvent: OrchestratorComponentMouseEvent): void {
    }

    reset(gameEngineState: GameEngineState): void {
        PlayerBattleActionBuilderStateService.setAnimationCompleted({
            actionBuilderState: gameEngineState.battleOrchestratorState.battleState.playerBattleActionBuilderState,
            animationCompleted: true
        });
    }

    start(state: GameEngineState): void {
    }

    update(state: GameEngineState, graphicsContext: GraphicsContext): void {
    }
}
