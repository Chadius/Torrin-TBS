import { BattleOrchestratorMode } from "./battleOrchestrator"
import { UIControlSettings } from "./uiControlSettings"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { MouseButton } from "../../utils/mouseConfig"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { ResourceHandler } from "../../resource/resourceHandler"

export enum OrchestratorComponentMouseEventType {
    UNKNOWN,
    CLICKED,
    MOVED,
}

export type OrchestratorComponentMouseEvent =
    | OrchestratorComponentMouseEventClicked
    | OrchestratorComponentMouseEventMoved

export type OrchestratorComponentMouseEventClicked = {
    eventType: OrchestratorComponentMouseEventType.CLICKED
    mouseX: number
    mouseY: number
    mouseButton: MouseButton
}

export type OrchestratorComponentMouseEventMoved = {
    eventType: OrchestratorComponentMouseEventType.MOVED
    mouseX: number
    mouseY: number
}

export enum OrchestratorComponentKeyEventType {
    UNKNOWN = "UNKNOWN",
    PRESSED = "PRESSED",
}

export type OrchestratorComponentKeyEvent = {
    eventType: OrchestratorComponentKeyEventType
    keyCode: number
}

export const OrchestratorComponentKeyEventService = {
    createPressedKeyEvent: (
        keyCode: number
    ): OrchestratorComponentKeyEvent => ({
        keyCode,
        eventType: OrchestratorComponentKeyEventType.PRESSED,
    }),
}

export type BattleOrchestratorChanges = {
    nextMode?: BattleOrchestratorMode
    checkMissionObjectives?: boolean
}

export interface BattleOrchestratorComponent {
    update({
        gameEngineState,
        graphicsContext,
        resourceHandler,
    }: {
        gameEngineState: GameEngineState
        graphicsContext: GraphicsBuffer
        resourceHandler: ResourceHandler
    }): void

    uiControlSettings(gameEngineState: GameEngineState): UIControlSettings

    mouseEventHappened(
        gameEngineState: GameEngineState,
        event: OrchestratorComponentMouseEvent
    ): void

    keyEventHappened(
        gameEngineState: GameEngineState,
        event: OrchestratorComponentKeyEvent
    ): void

    hasCompleted(gameEngineState: GameEngineState): boolean

    recommendStateChanges(
        gameEngineState: GameEngineState
    ): BattleOrchestratorChanges | undefined

    reset(gameEngineState: GameEngineState): void
}
