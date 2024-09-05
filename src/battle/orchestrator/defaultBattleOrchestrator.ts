import { UIControlSettings } from "./uiControlSettings"
import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent,
} from "./battleOrchestratorComponent"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { GameEngineState } from "../../gameEngine/gameEngine"

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

    uiControlSettings(state: GameEngineState): UIControlSettings {
        return undefined
    }

    update(state: GameEngineState, graphicsContext: GraphicsBuffer): void {
        // Required by inheritance
    }
}
