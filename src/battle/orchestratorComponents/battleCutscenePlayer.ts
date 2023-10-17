import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType
} from "../orchestrator/battleOrchestratorComponent";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {UIControlSettings} from "../orchestrator/uiControlSettings";
import {Cutscene} from "../../cutscene/cutscene";
import {GraphicsContext} from "../../utils/graphics/graphicsContext";

export class BattleCutscenePlayer implements BattleOrchestratorComponent {
    constructor() {
    }

    private _currentCutscene: Cutscene;

    get currentCutscene(): Cutscene {
        return this._currentCutscene;
    }

    private _currentCutsceneId: string;

    get currentCutsceneId(): string {
        return this._currentCutsceneId;
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
            this.currentCutscene.mouseClicked(event.mouseX, event.mouseY, {battleOrchestratorState: state});
            return;
        }
    }

    keyEventHappened(state: BattleOrchestratorState, event: OrchestratorComponentKeyEvent): void {
    }

    uiControlSettings(state: BattleOrchestratorState): UIControlSettings {
        return new UIControlSettings({
            scrollCamera: false,
            pauseTimer: true,
        });
    }

    update(state: BattleOrchestratorState, graphicsContext: GraphicsContext): void {
        if (this.currentCutscene && this.currentCutscene.hasLoaded() && !this.currentCutscene.isInProgress()) {
            this.currentCutscene.setResources();
            this.currentCutscene.start({battleOrchestratorState: state});
        }
        if (this.currentCutscene && this.currentCutscene.isInProgress()) {
            this.currentCutscene.update({battleOrchestratorState: state});
            this.currentCutscene.draw(graphicsContext);
        }
    }

    recommendStateChanges(state: BattleOrchestratorState): BattleOrchestratorChanges | undefined {
        return {
            displayMap: true,
        }
    }

    reset(state: BattleOrchestratorState) {
        this._currentCutsceneId = undefined;
        this._currentCutscene = undefined;
    }

    startCutscene(cutsceneId: string, state: BattleOrchestratorState) {
        if (!state.cutsceneCollection.cutsceneById[cutsceneId]) {
            throw new Error(`No cutscene with Id ${cutsceneId}`);
        }

        if (this.currentCutscene && this.currentCutscene.isInProgress()) {
            return;
        }

        this._currentCutsceneId = cutsceneId;
        this._currentCutscene = state.cutsceneCollection.cutsceneById[cutsceneId];
        this.currentCutscene.start({battleOrchestratorState: state});
    }
}
