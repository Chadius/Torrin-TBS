import {
    OrchestratorChanges,
    OrchestratorComponent,
    OrchestratorComponentMouseEvent
} from "../orchestrator/orchestratorComponent";
import {OrchestratorState} from "../orchestrator/orchestratorState";
import p5 from "p5";

const ACTIVITY_COMPLETED_WAIT_TIME_MS = 500;

export class BattleSquaddieMapActivity implements OrchestratorComponent {
    hasCompleted(state: OrchestratorState): boolean {
        return (Date.now() - state.squaddieCurrentlyActing.animationStartTime) >= ACTIVITY_COMPLETED_WAIT_TIME_MS;
    }

    mouseEventHappened(state: OrchestratorState, event: OrchestratorComponentMouseEvent): void {
    }

    recommendStateChanges(state: OrchestratorState): OrchestratorChanges | undefined {
        return {
            displayMap: true,
        }
    }

    reset(): void {
    }

    update(state: OrchestratorState, p?: p5): void {
    }
}