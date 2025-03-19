import { BattleOrchestratorMode } from "./battleOrchestrator"
import { UIControlSettings } from "./uiControlSettings"
import { GameEngineState } from "../../gameEngine/gameEngine"
import {
    MouseDrag,
    MousePress,
    MouseRelease,
    MouseWheel,
    ScreenLocation,
} from "../../utils/mouseConfig"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { ResourceHandler } from "../../resource/resourceHandler"

export enum OrchestratorComponentMouseEventType {
    UNKNOWN = "UNKNOWN",
    PRESS = "PRESS",
    RELEASE = "RELEASE",
    LOCATION = "LOCATION",
    WHEEL = "WHEEL",
    DRAG = "DRAG",
}

export type OrchestratorComponentMouseEvent =
    | OrchestratorComponentMouseEventPress
    | OrchestratorComponentMouseEventRelease
    | OrchestratorComponentMouseEventChangeLocation
    | OrchestratorComponentMouseEventWheel
    | OrchestratorComponentMouseEventDrag

export type OrchestratorComponentMouseEventPress = {
    eventType: OrchestratorComponentMouseEventType.PRESS
    mousePress: MousePress
}

export type OrchestratorComponentMouseEventRelease = {
    eventType: OrchestratorComponentMouseEventType.RELEASE
    mouseRelease: MouseRelease
}

export type OrchestratorComponentMouseEventChangeLocation = {
    eventType: OrchestratorComponentMouseEventType.LOCATION
    mouseLocation: ScreenLocation
}

export type OrchestratorComponentMouseEventWheel = {
    eventType: OrchestratorComponentMouseEventType.WHEEL
    mouseWheel: MouseWheel
}

export type OrchestratorComponentMouseEventDrag = {
    eventType: OrchestratorComponentMouseEventType.DRAG
    mouseDrag: MouseDrag
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
