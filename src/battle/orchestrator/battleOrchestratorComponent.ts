import {BattleOrchestratorState} from "./battleOrchestratorState";
import {BattleOrchestratorMode} from "./battleOrchestrator";
import {UIControlSettings} from "./uiControlSettings";
import {GraphicsContext} from "../../utils/graphics/graphicsContext";

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
    checkMissionObjectives?: boolean;
}

export interface BattleOrchestratorComponent {
    update(state: BattleOrchestratorState, graphicsContext: GraphicsContext): void;

    uiControlSettings(state: BattleOrchestratorState): UIControlSettings;

    mouseEventHappened(state: BattleOrchestratorState, event: OrchestratorComponentMouseEvent): void;

    keyEventHappened(state: BattleOrchestratorState, event: OrchestratorComponentKeyEvent): void;

    hasCompleted(state: BattleOrchestratorState): boolean;

    recommendStateChanges(state: BattleOrchestratorState): BattleOrchestratorChanges | undefined;

    reset(state: BattleOrchestratorState): void;
}
