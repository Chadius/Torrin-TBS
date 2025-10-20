import { TBattleOrchestratorMode } from "./battleOrchestrator"
import { BattleUISettings } from "./uiSettings/uiSettings"
import {
    MouseDrag,
    MousePress,
    MouseRelease,
    MouseWheel,
    ScreenLocation,
} from "../../utils/mouseConfig"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { ResourceHandler } from "../../resource/resourceHandler"
import { EnumLike } from "../../utils/enum"
import { GameEngineState } from "../../gameEngine/gameEngineState/gameEngineState"

export const OrchestratorComponentMouseEventType = {
    UNKNOWN: "UNKNOWN",
    PRESS: "PRESS",
    RELEASE: "RELEASE",
    LOCATION: "LOCATION",
    WHEEL: "WHEEL",
    DRAG: "DRAG",
} as const satisfies Record<string, string>
export type TOrchestratorComponentMouseEventType = EnumLike<
    typeof OrchestratorComponentMouseEventType
>

export type OrchestratorComponentMouseEvent =
    | OrchestratorComponentMouseEventPress
    | OrchestratorComponentMouseEventRelease
    | OrchestratorComponentMouseEventChangeLocation
    | OrchestratorComponentMouseEventWheel
    | OrchestratorComponentMouseEventDrag

export type OrchestratorComponentMouseEventPress = {
    eventType: (typeof OrchestratorComponentMouseEventType)["PRESS"]
    mousePress: MousePress
}

export type OrchestratorComponentMouseEventRelease = {
    eventType: (typeof OrchestratorComponentMouseEventType)["RELEASE"]
    mouseRelease: MouseRelease
}

export type OrchestratorComponentMouseEventChangeLocation = {
    eventType: (typeof OrchestratorComponentMouseEventType)["LOCATION"]
    mouseLocation: ScreenLocation
}

export type OrchestratorComponentMouseEventWheel = {
    eventType: (typeof OrchestratorComponentMouseEventType)["WHEEL"]
    mouseWheel: MouseWheel
}

export type OrchestratorComponentMouseEventDrag = {
    eventType: (typeof OrchestratorComponentMouseEventType)["DRAG"]
    mouseDrag: MouseDrag
}

export const OrchestratorComponentKeyEventType = {
    UNKNOWN: "UNKNOWN",
    PRESSED: "PRESSED",
} as const satisfies Record<string, string>
export type TOrchestratorComponentKeyEventType = EnumLike<
    typeof OrchestratorComponentKeyEventType
>

export type OrchestratorComponentKeyEvent = {
    eventType: TOrchestratorComponentKeyEventType
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
    nextMode?: TBattleOrchestratorMode | undefined
    checkMissionObjectives?: boolean
}

export interface BattleOrchestratorComponent {
    update({ gameEngineState }: { gameEngineState: GameEngineState }): void

    draw({}: {
        gameEngineState: GameEngineState
        graphics: GraphicsBuffer
        resourceHandler: ResourceHandler | undefined
    }): void

    uiControlSettings(
        gameEngineState: GameEngineState
    ): BattleUISettings | undefined

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
