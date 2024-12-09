import { OrchestratorComponentMouseEvent } from "../orchestrator/battleOrchestratorComponent"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { ResourceHandler } from "../../resource/resourceHandler"

export interface SquaddieActionAnimator {
    hasCompleted(state: GameEngineState): boolean

    mouseEventHappened(
        state: GameEngineState,
        mouseEvent: OrchestratorComponentMouseEvent
    ): void

    start(state: GameEngineState): void

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
