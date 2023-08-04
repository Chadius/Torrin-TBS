import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType
} from "../orchestrator/battleOrchestratorComponent";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import p5 from "p5";
import {UIControlSettings} from "../orchestrator/uiControlSettings";

export class BattleCutscenePlayer implements BattleOrchestratorComponent {
    constructor() {
    }

    hasCompleted(state: BattleOrchestratorState): boolean {
        return !(state.currentCutscene && state.currentCutscene.isInProgress());
    }

    mouseEventHappened(state: BattleOrchestratorState, event: OrchestratorComponentMouseEvent): void {
        if (event.eventType === OrchestratorComponentMouseEventType.MOVED && state.currentCutscene && state.currentCutscene.isInProgress()) {
            state.currentCutscene.mouseMoved(event.mouseX, event.mouseY);
            return;
        }
        if (event.eventType === OrchestratorComponentMouseEventType.CLICKED && state.currentCutscene && state.currentCutscene.isInProgress()) {
            state.currentCutscene.mouseClicked(event.mouseX, event.mouseY);
            return;
        }
    }

    keyEventHappened(state: BattleOrchestratorState, event: OrchestratorComponentKeyEvent): void {
    }

    uiControlSettings(state: BattleOrchestratorState): UIControlSettings {
        return new UIControlSettings({
            scrollCamera: false,
        });
    }

    update(state: BattleOrchestratorState, p: p5): void {
        if (p && state.currentCutscene && state.currentCutscene.hasLoaded() && !state.currentCutscene.isInProgress()) {
            state.currentCutscene.setResources();
            state.currentCutscene.start();
        }
        if (p && state.currentCutscene && state.currentCutscene.isInProgress()) {
            state.currentCutscene.update();
            state.currentCutscene.draw(p);
        }
    }

    recommendStateChanges(state: BattleOrchestratorState): BattleOrchestratorChanges | undefined {
        return {
            displayMap: true,
        }
    }

    reset(state: BattleOrchestratorState) {
    }
}
