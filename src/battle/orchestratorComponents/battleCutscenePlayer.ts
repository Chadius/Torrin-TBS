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
import {Cutscene} from "../../cutscene/cutscene";

export class BattleCutscenePlayer implements BattleOrchestratorComponent {
    constructor({cutsceneById}: {
        cutsceneById: {
            [id: string]: Cutscene
        }
    }) {
        if (cutsceneById) {
            this._cutsceneById = {...cutsceneById};
        } else {
            this._cutsceneById = {};
        }
    }

    get currentCutscene(): Cutscene {
        return this.cutsceneById[this.currentCutsceneId];
    }

    private _currentCutsceneId: string;

    get currentCutsceneId(): string {
        return this._currentCutsceneId;
    }

    private _cutsceneById: {
        [id: string]: Cutscene
    }

    get cutsceneById(): { [p: string]: Cutscene } {
        return this._cutsceneById;
    }

    hasCompleted(state: BattleOrchestratorState): boolean {
        return !(this.currentCutscene && this.currentCutscene.isInProgress());
    }

    mouseEventHappened(state: BattleOrchestratorState, event: OrchestratorComponentMouseEvent): void {
        if (event.eventType === OrchestratorComponentMouseEventType.MOVED && this.currentCutscene && this.currentCutscene.isInProgress()) {
            this.currentCutscene.mouseMoved(event.mouseX, event.mouseY);
            return;
        }
        if (event.eventType === OrchestratorComponentMouseEventType.CLICKED && this.currentCutscene && this.currentCutscene.isInProgress()) {
            this.currentCutscene.mouseClicked(event.mouseX, event.mouseY);
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
        if (p && this.currentCutscene && this.currentCutscene.hasLoaded() && !this.currentCutscene.isInProgress()) {
            this.currentCutscene.setResources();
            this.currentCutscene.start();
        }
        if (p && this.currentCutscene && this.currentCutscene.isInProgress()) {
            this.currentCutscene.update();
            this.currentCutscene.draw(p);
        }
    }

    recommendStateChanges(state: BattleOrchestratorState): BattleOrchestratorChanges | undefined {
        return {
            displayMap: true,
        }
    }

    reset(state: BattleOrchestratorState) {
        this._currentCutsceneId = undefined;
    }

    startCutscene(cutsceneId: string) {
        if (!this.cutsceneById[cutsceneId]) {
            throw new Error(`No cutscene with Id ${cutsceneId}`);
        }

        if (this.currentCutscene && this.currentCutscene.isInProgress()) {
            return;
        }

        this._currentCutsceneId = cutsceneId;
        this.currentCutscene.start();
    }
}
