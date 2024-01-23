import {OrchestratorComponentMouseEvent} from "../orchestrator/battleOrchestratorComponent";
import {SquaddieActionAnimator} from "./squaddieActionAnimator";
import {GraphicsContext} from "../../utils/graphics/graphicsContext";
import {GameEngineState} from "../../gameEngine/gameEngine";

export class DefaultSquaddieActionAnimator implements SquaddieActionAnimator {
    hasCompleted(state: GameEngineState): boolean {
        return true;
    }

    mouseEventHappened(state: GameEngineState, mouseEvent: OrchestratorComponentMouseEvent): void {
    }

    reset(state: GameEngineState): void {
    }

    start(state: GameEngineState): void {
    }

    update(state: GameEngineState, graphicsContext: GraphicsContext): void {
    }
}
