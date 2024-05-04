import {BattleOrchestratorMode} from "./battleOrchestrator";
import {UIControlSettings} from "./uiControlSettings";
import {GraphicsContext} from "../../utils/graphics/graphicsContext";
import {GameEngineState} from "../../gameEngine/gameEngine";
import {MouseButton} from "../../utils/mouseConfig";

export enum OrchestratorComponentMouseEventType {
    UNKNOWN,
    CLICKED,
    MOVED,
}

export type OrchestratorComponentMouseEvent = {
    eventType: OrchestratorComponentMouseEventType;
    mouseX: number;
    mouseY: number;
    mouseButton: MouseButton;
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
    update(gameEngineState: GameEngineState, graphicsContext: GraphicsContext): void;

    uiControlSettings(gameEngineState: GameEngineState): UIControlSettings;

    mouseEventHappened(gameEngineState: GameEngineState, event: OrchestratorComponentMouseEvent): void;

    keyEventHappened(gameEngineState: GameEngineState, event: OrchestratorComponentKeyEvent): void;

    hasCompleted(gameEngineState: GameEngineState): boolean;

    recommendStateChanges(gameEngineState: GameEngineState): BattleOrchestratorChanges | undefined;

    reset(gameEngineState: GameEngineState): void;
}
