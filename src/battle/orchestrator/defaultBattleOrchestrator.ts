import {UIControlSettings} from "./uiControlSettings";
import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent
} from "./battleOrchestratorComponent";
import {GraphicsContext} from "../../utils/graphics/graphicsContext";
import {GameEngineState} from "../../gameEngine/gameEngine";

export class DefaultBattleOrchestrator implements BattleOrchestratorComponent {
    hasCompleted(state: GameEngineState): boolean {
        return true;
    }

    keyEventHappened(state: GameEngineState, event: OrchestratorComponentKeyEvent): void {
    }

    mouseEventHappened(state: GameEngineState, event: OrchestratorComponentMouseEvent): void {
    }

    recommendStateChanges(state: GameEngineState): BattleOrchestratorChanges | undefined {
        return {};
    }

    reset(state: GameEngineState): void {
    }

    uiControlSettings(state: GameEngineState): UIControlSettings {
        return undefined;
    }

    update(state: GameEngineState, graphicsContext: GraphicsContext): void {
    }
}
