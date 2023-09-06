import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {OrchestratorComponentMouseEvent} from "../orchestrator/battleOrchestratorComponent";
import p5 from "p5";

export interface SquaddieActionAnimator {
    hasCompleted(state: BattleOrchestratorState): boolean;

    mouseEventHappened(state: BattleOrchestratorState, mouseEvent: OrchestratorComponentMouseEvent): void;

    start(state: BattleOrchestratorState): void;

    update(state: BattleOrchestratorState, graphicsContext: p5): void;

    reset(state: BattleOrchestratorState): void;
}

