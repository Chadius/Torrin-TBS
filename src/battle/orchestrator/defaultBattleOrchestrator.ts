import { UIControlSettings } from "./uiControlSettings"
import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent,
} from "./battleOrchestratorComponent"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { ResourceHandler } from "../../resource/resourceHandler"
import { GameEngineState } from "../../gameEngine/gameEngineState/gameEngineState"

export class DefaultBattleOrchestrator implements BattleOrchestratorComponent {
    hasCompleted(_: GameEngineState): boolean {
        return true
    }

    keyEventHappened(
        _state: GameEngineState,
        _event: OrchestratorComponentKeyEvent
    ): void {
        // Required by inheritance
    }

    mouseEventHappened(
        _state: GameEngineState,
        _event: OrchestratorComponentMouseEvent
    ): void {
        // Required by inheritance
    }

    recommendStateChanges(
        _: GameEngineState
    ): BattleOrchestratorChanges | undefined {
        return {}
    }

    reset(_: GameEngineState): void {
        // Required by inheritance
    }

    uiControlSettings(_: GameEngineState): UIControlSettings {
        return new UIControlSettings({})
    }

    update({}: {
        gameEngineState: GameEngineState
        graphicsContext: GraphicsBuffer
        resourceHandler: ResourceHandler | undefined
    }): void {
        // Required by inheritance
    }
}
