import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {OrchestratorComponentMouseEvent} from "../orchestrator/battleOrchestratorComponent";
import {GraphicsContext} from "../../utils/graphics/graphicsContext";

export interface SquaddieActionAnimator {
    hasCompleted(state: BattleOrchestratorState): boolean;

    mouseEventHappened(state: BattleOrchestratorState, mouseEvent: OrchestratorComponentMouseEvent): void;

    start(state: BattleOrchestratorState): void;

    update(state: BattleOrchestratorState, graphicsContext: GraphicsContext): void;

    reset(state: BattleOrchestratorState): void;
}

