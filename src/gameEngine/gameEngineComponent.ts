import { MouseButton } from "../utils/mouseConfig"
import { GameEngineState } from "./gameEngine"
import { GameModeEnum } from "../utils/startupConfig"
import { GraphicsBuffer } from "../utils/graphics/graphicsRenderer"

export type GameEngineChanges = {
    nextMode?: GameModeEnum
}

export interface GameEngineComponent {
    update(state: GameEngineState, graphicsContext: GraphicsBuffer): void

    keyPressed(gameEngineState: GameEngineState, keyCode: number): void

    mouseClicked(
        state: GameEngineState,
        mouseButton: MouseButton,
        mouseX: number,
        mouseY: number
    ): void

    mouseMoved(state: GameEngineState, mouseX: number, mouseY: number): void

    hasCompleted(state: GameEngineState): boolean

    recommendStateChanges(
        gameEngineState: GameEngineState
    ): GameEngineChanges | undefined

    reset(state: GameEngineState): void
}
