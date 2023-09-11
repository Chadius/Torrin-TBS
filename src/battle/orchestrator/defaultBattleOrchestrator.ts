import {BattleOrchestratorState} from "./battleOrchestratorState";
import {UIControlSettings} from "./uiControlSettings";
import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent
} from "./battleOrchestratorComponent";
import {GraphicsContext} from "../../utils/graphics/graphicsContext";

export class DefaultBattleOrchestrator implements BattleOrchestratorComponent {
    hasCompleted(state: BattleOrchestratorState): boolean {
        return true;
    }

    keyEventHappened(state: BattleOrchestratorState, event: OrchestratorComponentKeyEvent): void {
    }

    mouseEventHappened(state: BattleOrchestratorState, event: OrchestratorComponentMouseEvent): void {
    }

    recommendStateChanges(state: BattleOrchestratorState): BattleOrchestratorChanges | undefined {
        return {};
    }

    reset(state: BattleOrchestratorState): void {
    }

    uiControlSettings(state: BattleOrchestratorState): UIControlSettings {
        return undefined;
    }

    update(state: BattleOrchestratorState, graphicsContext: GraphicsContext): void {
    }
}
