import {OrchestratorComponent, OrchestratorComponentMouseEvent} from "./orchestrator/orchestratorComponent";
import {OrchestratorState} from "./orchestrator/orchestratorState";

export class BattleResourceLoader implements OrchestratorComponent{
    constructor() {
    }
    update(state: OrchestratorState) {
    }

    mouseEventHappened(event: OrchestratorComponentMouseEvent) {};

    hasCompleted(): boolean {
        return false;
    }
}