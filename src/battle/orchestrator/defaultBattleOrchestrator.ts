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
    hasCompleted(state: GameEngineState): boolean {
        return true
    }

    keyEventHappened(
        state: GameEngineState,
        event: OrchestratorComponentKeyEvent
    ): void {
        // Required by inheritance
    }

    mouseEventHappened(
        state: GameEngineState,
        event: OrchestratorComponentMouseEvent
    ): void {
        // Required by inheritance
    }

    recommendStateChanges(
        state: GameEngineState
    ): BattleOrchestratorChanges | undefined {
        return {}
    }

    reset(state: GameEngineState): void {
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
