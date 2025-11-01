import {
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent,
} from "../orchestrator/battleOrchestratorComponent"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { GameEngineState } from "../../gameEngine/gameEngineState/gameEngineState"
import { ResourceRepository } from "../../resource/resourceRepository.ts"

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
        resourceRepository,
    }: {
        gameEngineState: GameEngineState
        graphicsContext: GraphicsBuffer
        resourceRepository: ResourceRepository
    }): void

    reset(state: GameEngineState): void
}
