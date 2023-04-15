import {OrchestratorComponent, OrchestratorComponentMouseEvent} from "./orchestrator/orchestratorComponent";
import {OrchestratorState} from "./orchestrator/orchestratorState";

export class BattleMapDisplay implements OrchestratorComponent{
    draw(state: OrchestratorState): void {

    }

    hasCompleted(state: OrchestratorState): boolean {
        return false;
    }

    mouseEventHappened(state: OrchestratorState, event: OrchestratorComponentMouseEvent): void {
    }

    update(state: OrchestratorState): void {
        this.draw(state);
    }
}