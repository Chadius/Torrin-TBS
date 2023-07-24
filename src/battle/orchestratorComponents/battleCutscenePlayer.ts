import {
    OrchestratorChanges,
    OrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType
} from "../orchestrator/orchestratorComponent";
import {OrchestratorState} from "../orchestrator/orchestratorState";
import p5 from "p5";
import {UIControlSettings} from "../orchestrator/uiControlSettings";

export class BattleCutscenePlayer implements OrchestratorComponent {
    constructor() {
    }

    hasCompleted(state: OrchestratorState): boolean {
        return !(state.currentCutscene && state.currentCutscene.isInProgress());
    }

    mouseEventHappened(state: OrchestratorState, event: OrchestratorComponentMouseEvent): void {
        if (event.eventType === OrchestratorComponentMouseEventType.MOVED && state.currentCutscene && state.currentCutscene.isInProgress()) {
            state.currentCutscene.mouseMoved(event.mouseX, event.mouseY);
            return;
        }
        if (event.eventType === OrchestratorComponentMouseEventType.CLICKED && state.currentCutscene && state.currentCutscene.isInProgress()) {
            state.currentCutscene.mouseClicked(event.mouseX, event.mouseY);
            return;
        }
    }

    keyEventHappened(state: OrchestratorState, event: OrchestratorComponentKeyEvent): void {
    }

    uiControlSettings(state: OrchestratorState): UIControlSettings {
        return new UIControlSettings({
            scrollCamera: false,
        });
    }

    update(state: OrchestratorState, p: p5): void {
        if (p && state.currentCutscene && state.currentCutscene.hasLoaded() && !state.currentCutscene.isInProgress()) {
            state.currentCutscene.setResources();
            state.currentCutscene.start();
        }
        if (p && state.currentCutscene && state.currentCutscene.isInProgress()) {
            state.currentCutscene.update();
            state.currentCutscene.draw(p);
        }
    }

    recommendStateChanges(state: OrchestratorState): OrchestratorChanges | undefined {
        return {
            displayMap: true,
        }
    }

    reset(state: OrchestratorState) {
    }
}
