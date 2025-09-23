import {
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent,
} from "../orchestrator/battleOrchestratorComponent"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { ResourceHandler } from "../../resource/resourceHandler"
import { GameEngineState } from "../../gameEngine/gameEngineState/gameEngineState"

export interface SquaddieActionAnimator {
    hasCompleted(gameEngineState: GameEngineState): boolean

    mouseEventHappened(
        gameEngineState: GameEngineState,
        mouseEvent: OrchestratorComponentMouseEvent
    ): void

    keyEventHappened(
        gameEngineState: GameEngineState,
        keyEvent: OrchestratorComponentKeyEvent
    ): void

    start(gameEngineState: GameEngineState): void

    update({
        gameEngineState,
        graphicsContext,
        resourceHandler,
    }: {
        gameEngineState: GameEngineState
        graphicsContext: GraphicsBuffer
        resourceHandler: ResourceHandler
    }): void

    reset(state: GameEngineState): void
}
