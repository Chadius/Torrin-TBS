import {BattleOrchestratorMode} from "./battleOrchestrator";
import {UIControlSettings} from "./uiControlSettings";
import {GraphicsContext} from "../../utils/graphics/graphicsContext";
import {GameEngineState} from "../../gameEngine/gameEngine";

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
    update(state: GameEngineState, graphicsContext: GraphicsContext): void;

    uiControlSettings(state: GameEngineState): UIControlSettings;

    mouseEventHappened(state: GameEngineState, event: OrchestratorComponentMouseEvent): void;

    keyEventHappened(state: GameEngineState, event: OrchestratorComponentKeyEvent): void;

    hasCompleted(state: GameEngineState): boolean;

    recommendStateChanges(state: GameEngineState): BattleOrchestratorChanges | undefined;

    reset(state: GameEngineState): void;
}
