import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {OrchestratorComponentMouseEvent} from "../orchestrator/battleOrchestratorComponent";
import {SquaddieActionAnimator} from "./squaddieActionAnimator";
import {GraphicsContext} from "../../utils/graphics/graphicsContext";

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

    update(state: BattleOrchestratorState, graphicsContext: GraphicsContext): void {
    }
}
