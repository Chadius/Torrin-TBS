import { BattleOrchestratorMode } from "./battleOrchestrator"
import { UIControlSettings } from "./uiControlSettings"
import { GameEngineState } from "../../gameEngine/gameEngine"
import {
    MousePress,
    MouseRelease,
    ScreenLocation,
} from "../../utils/mouseConfig"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { ResourceHandler } from "../../resource/resourceHandler"

export enum OrchestratorComponentMouseEventType {
    UNKNOWN,
    PRESS,
    RELEASE,
    LOCATION,
}

export type OrchestratorComponentMouseEvent =
    | OrchestratorComponentMouseEventPress
    | OrchestratorComponentMouseEventRelease
    | OrchestratorComponentMouseEventChangeLocation

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
