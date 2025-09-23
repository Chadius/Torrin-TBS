import {
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent,
} from "../orchestrator/battleOrchestratorComponent"
import { SquaddieActionAnimator } from "./squaddieActionAnimator"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { BattleActionService } from "../history/battleAction/battleAction"
import { BattleActionRecorderService } from "../history/battleAction/battleActionRecorder"
import { ResourceHandler } from "../../resource/resourceHandler"
import { GameEngineState } from "../../gameEngine/gameEngineState/gameEngineState"

export class DefaultSquaddieActionAnimator implements SquaddieActionAnimator {
    hasCompleted(_: GameEngineState): boolean {
        return true
    }

    mouseEventHappened(
        _state: GameEngineState,
        _mouseEvent: OrchestratorComponentMouseEvent
    ): void {
        // Required by inheritance
    }

    keyEventHappened(
        _gameEngineState: GameEngineState,
        _keyEvent: OrchestratorComponentKeyEvent
    ): void {
        // Required by inheritance
    }

    reset(gameEngineState: GameEngineState): void {
        const battleAction = BattleActionRecorderService.peekAtAnimationQueue(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder
        )
        if (battleAction == undefined) return
        BattleActionService.setAnimationCompleted({
            battleAction: battleAction,
            animationCompleted: true,
        })
    }

    start(state: GameEngineState): void {
        // Required by inheritance
    }

    update({}: {
        gameEngineState: GameEngineState
        graphicsContext: GraphicsBuffer
        resourceHandler: ResourceHandler
    }): void {
        // Required by inheritance
    }
}
