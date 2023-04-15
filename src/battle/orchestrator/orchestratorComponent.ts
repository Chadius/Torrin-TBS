import {OrchestratorState} from "./orchestratorState";
import p5 from "p5";

export enum OrchestratorComponentMouseEventType {
    UNKNOWN,
    CLICKED,
    MOVED,
}

export type OrchestratorComponentMouseEvent = {
    eventType: OrchestratorComponentMouseEventType;
    mouseX: number;
    mouseY: number;
}

export interface OrchestratorComponent {
    update(state: OrchestratorState, p?: p5): void;
    mouseEventHappened(state: OrchestratorState, event: OrchestratorComponentMouseEvent): void;
    hasCompleted(state: OrchestratorState): boolean;
}