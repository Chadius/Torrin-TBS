import {
    MouseDrag,
    MousePress,
    MouseRelease,
    MouseWheel,
    ScreenLocation,
} from "../utils/mouseConfig"
import { TGameMode } from "../utils/startupConfig"
import { GraphicsBuffer } from "../utils/graphics/graphicsRenderer"
import { GameEngineState } from "./gameEngineState/gameEngineState"

export type GameEngineChanges = {
    nextMode?: TGameMode
}

export interface GameEngineComponent {
    update(
        state: GameEngineState,
        graphicsContext: GraphicsBuffer
    ): Promise<void>

    keyPressed(gameEngineState: GameEngineState, keyCode: number): void

    mousePressed(gameEngineState: GameEngineState, mousePress: MousePress): void

    mouseReleased(
        gameEngineState: GameEngineState,
        mouseRelease: MouseRelease
    ): void

    mouseMoved(
        gameEngineState: GameEngineState,
        mouseLocation: ScreenLocation
    ): void

    mouseWheel(gameEngineState: GameEngineState, mouseWheel: MouseWheel): void

    mouseDragged(gameEngineState: GameEngineState, mouseDrag: MouseDrag): void

    hasCompleted(gameEngineState: GameEngineState): boolean

    recommendStateChanges(
        gameEngineState: GameEngineState
    ): GameEngineChanges | undefined

    reset(gameEngineState: GameEngineState): void
}
