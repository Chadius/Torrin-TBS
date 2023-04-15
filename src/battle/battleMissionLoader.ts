import {OrchestratorComponent, OrchestratorComponentMouseEvent} from "./orchestrator/orchestratorComponent";
import {OrchestratorState} from "./orchestrator/orchestratorState";

export class BattleMissionLoader implements OrchestratorComponent {
    constructor() {
    }

    update(state: OrchestratorState) {
    }

    mouseEventHappened(event: OrchestratorComponentMouseEvent) {};

    hasCompleted(): boolean {
        return false;
    }
}