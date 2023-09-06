import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {OrchestratorComponentMouseEvent} from "../orchestrator/battleOrchestratorComponent";
import p5 from "p5";
import {SquaddieActionAnimator} from "./squaddieActionAnimator";

export class DefaultSquaddieActionAnimator implements SquaddieActionAnimator {
    hasCompleted(state: BattleOrchestratorState): boolean {
        return true;
    }

    mouseEventHappened(state: BattleOrchestratorState, mouseEvent: OrchestratorComponentMouseEvent): void {
    }

    reset(state: BattleOrchestratorState): void {
    }

    start(state: BattleOrchestratorState): void {
    }

    update(state: BattleOrchestratorState, graphicsContext: p5): void {
    }
}
