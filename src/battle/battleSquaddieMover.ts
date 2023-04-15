import {OrchestratorComponent, OrchestratorComponentMouseEvent} from "./orchestrator/orchestratorComponent";
import {OrchestratorState} from "./orchestrator/orchestratorState";

export class BattleSquaddieMover implements OrchestratorComponent{
    hasCompleted(state: OrchestratorState): boolean {
        return false;
    }

    mouseEventHappened(state: OrchestratorState, event: OrchestratorComponentMouseEvent): void {
    }

    update(state: OrchestratorState): void {
    }
}