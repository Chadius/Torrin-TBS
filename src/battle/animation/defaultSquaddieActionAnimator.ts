import { OrchestratorComponentMouseEvent } from "../orchestrator/battleOrchestratorComponent"
import { SquaddieActionAnimator } from "./squaddieActionAnimator"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { BattleActionService } from "../history/battleAction/battleAction"
import { BattleActionRecorderService } from "../history/battleAction/battleActionRecorder"
import { ResourceHandler } from "../../resource/resourceHandler"

export class DefaultSquaddieActionAnimator implements SquaddieActionAnimator {
    hasCompleted(state: GameEngineState): boolean {
        return true
    }

    mouseEventHappened(
        state: GameEngineState,
        mouseEvent: OrchestratorComponentMouseEvent
    ): void {
        // Required by inheritance
    }

    reset(gameEngineState: GameEngineState): void {
        BattleActionService.setAnimationCompleted({
            battleAction: BattleActionRecorderService.peekAtAnimationQueue(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder
            ),
            animationCompleted: true,
        })
    }

    start(state: GameEngineState): void {
        // Required by inheritance
    }

    update({
        gameEngineState,
        graphicsContext,
        resourceHandler,
    }: {
        gameEngineState: GameEngineState
        graphicsContext: GraphicsBuffer
        resourceHandler: ResourceHandler
    }): void {
        // Required by inheritance
    }
}
