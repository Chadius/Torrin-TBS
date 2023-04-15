import {OrchestratorState} from "./orchestratorState";

export type OrchestratorComponentMouseEvent = {
    eventType: "CLICKED" | "MOVED";
    mouseX: number;
    mouseY: number;
}

export interface OrchestratorComponent {
    update(state: OrchestratorState): void;
    mouseEventHappened(event: OrchestratorComponentMouseEvent): void;
    hasCompleted(): boolean;
}