import { MousePress, MouseRelease, ScreenLocation } from "../utils/mouseConfig"
import { GameEngineState } from "./gameEngine"
import { GameModeEnum } from "../utils/startupConfig"
import { GraphicsBuffer } from "../utils/graphics/graphicsRenderer"

export type GameEngineChanges = {
    nextMode?: GameModeEnum
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

    hasCompleted(gameEngineState: GameEngineState): boolean

    recommendStateChanges(
        gameEngineState: GameEngineState
    ): GameEngineChanges | undefined

    reset(gameEngineState: GameEngineState): void
}
