import {OrchestratorComponent, OrchestratorComponentMouseEvent} from "./orchestrator/orchestratorComponent";
import {OrchestratorState} from "./orchestrator/orchestratorState";

export class BattleSquaddieMover implements OrchestratorComponent{
    hasCompleted(): boolean {
        return false;
    }

    mouseEventHappened(event: OrchestratorComponentMouseEvent): void {
    }

    update(state: OrchestratorState): void {
    }

}