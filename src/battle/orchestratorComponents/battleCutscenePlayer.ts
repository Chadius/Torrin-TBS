import {
    OrchestratorComponent,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType
} from "../orchestrator/orchestratorComponent";
import {OrchestratorState} from "../orchestrator/orchestratorState";
import p5 from "p5";

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

    update(state: OrchestratorState, p?: p5): void {
        if (p && state.currentCutscene && state.currentCutscene.hasLoaded() && !state.currentCutscene.isInProgress()) {
            state.currentCutscene.setResources();
            state.currentCutscene.start();
        }
        if (p && state.currentCutscene && state.currentCutscene.isInProgress()) {
            state.currentCutscene.update();
            state.currentCutscene.draw(p);
        }
    }
}