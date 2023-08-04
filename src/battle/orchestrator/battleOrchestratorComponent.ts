import {BattleOrchestratorState} from "./battleOrchestratorState";
import p5 from "p5";
import {BattleOrchestratorMode} from "./battleOrchestrator";
import {UIControlSettings} from "./uiControlSettings";

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

export type BattleOrchestratorChanges = {
    displayMap?: boolean;
    nextMode?: BattleOrchestratorMode;
}

export interface BattleOrchestratorComponent {
    update(state: BattleOrchestratorState, p: p5): void;

    uiControlSettings(state: BattleOrchestratorState): UIControlSettings;

    mouseEventHappened(state: BattleOrchestratorState, event: OrchestratorComponentMouseEvent): void;

    keyEventHappened(state: BattleOrchestratorState, event: OrchestratorComponentKeyEvent): void;

    hasCompleted(state: BattleOrchestratorState): boolean;

    recommendStateChanges(state: BattleOrchestratorState): BattleOrchestratorChanges | undefined;

    reset(state: BattleOrchestratorState): void;
}
