import {OrchestratorState} from "./orchestratorState";
import p5 from "p5";
import {BattleOrchestratorMode} from "./orchestrator";

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

export enum OrchestratorComponentKeyEventType {
    UNKNOWN,
    PRESSED,
}

export type OrchestratorComponentKeyEvent = {
    eventType: OrchestratorComponentKeyEventType;
    keyCode: number;
}

export type OrchestratorChanges = {
    displayMap?: boolean;
    nextMode?: BattleOrchestratorMode;
}

export interface OrchestratorComponent {
    update(state: OrchestratorState, p: p5): void;

    mouseEventHappened(state: OrchestratorState, event: OrchestratorComponentMouseEvent): void;

    keyEventHappened(state: OrchestratorState, event: OrchestratorComponentKeyEvent): void;

    hasCompleted(state: OrchestratorState): boolean;

    recommendStateChanges(state: OrchestratorState): OrchestratorChanges | undefined;

    reset(state: OrchestratorState): void;
}
