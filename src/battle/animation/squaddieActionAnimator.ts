import {OrchestratorComponentMouseEvent} from "../orchestrator/battleOrchestratorComponent";
import {GraphicsContext} from "../../utils/graphics/graphicsContext";
import {GameEngineState} from "../../gameEngine/gameEngine";

export interface SquaddieActionAnimator {
    hasCompleted(state: GameEngineState): boolean;

    mouseEventHappened(state: GameEngineState, mouseEvent: OrchestratorComponentMouseEvent): void;

    start(state: GameEngineState): void;

    update(state: GameEngineState, graphicsContext: GraphicsContext): void;

    reset(state: GameEngineState): void;
}

