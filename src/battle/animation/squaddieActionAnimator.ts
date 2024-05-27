import {OrchestratorComponentMouseEvent} from "../orchestrator/battleOrchestratorComponent";
import {GraphicsBuffer} from "../../utils/graphics/graphicsRenderer";
import {GameEngineState} from "../../gameEngine/gameEngine";

export interface SquaddieActionAnimator {
    hasCompleted(state: GameEngineState): boolean;

    mouseEventHappened(state: GameEngineState, mouseEvent: OrchestratorComponentMouseEvent): void;

    start(state: GameEngineState): void;

    update(state: GameEngineState, graphics: GraphicsBuffer): void;

    reset(state: GameEngineState): void;
}

