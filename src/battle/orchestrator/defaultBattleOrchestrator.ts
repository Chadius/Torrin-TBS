import {
    BattleUISettings,
    BattleUISettingsService,
} from "./uiSettings/uiSettings"
import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent,
} from "./battleOrchestratorComponent"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { GameEngineState } from "../../gameEngine/gameEngineState/gameEngineState"
import { ResourceRepository } from "../../resource/resourceRepository.ts"

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

    uiControlSettings(_: GameEngineState): BattleUISettings {
        return BattleUISettingsService.new({})
    }

    update({}: { gameEngineState: GameEngineState }): void {
        // Required by inheritance
    }

    draw({
        gameEngineState,
    }: {
        gameEngineState: GameEngineState
        graphics: GraphicsBuffer
    }): ResourceRepository | undefined {
        // Required by inheritance
        return gameEngineState.resourceRepository
    }
}
