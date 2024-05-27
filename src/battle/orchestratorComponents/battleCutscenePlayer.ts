import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentKeyEventType,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType
} from "../orchestrator/battleOrchestratorComponent";
import {UIControlSettings} from "../orchestrator/uiControlSettings";
import {Cutscene, CutsceneService} from "../../cutscene/cutscene";
import {GraphicsBuffer} from "../../utils/graphics/graphicsRenderer";
import {GameEngineState} from "../../gameEngine/gameEngine";
import {isValidValue} from "../../utils/validityCheck";

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

    hasCompleted(state: GameEngineState): boolean {
        return !(this.currentCutscene && CutsceneService.isInProgress(this.currentCutscene));
    }

    mouseEventHappened(state: GameEngineState, event: OrchestratorComponentMouseEvent): void {
        if (event.eventType === OrchestratorComponentMouseEventType.MOVED && this.currentCutscene && CutsceneService.isInProgress(this.currentCutscene)) {
            CutsceneService.mouseMoved(this.currentCutscene, event.mouseX, event.mouseY);
            return;
        }
        if (event.eventType === OrchestratorComponentMouseEventType.CLICKED && this.currentCutscene && CutsceneService.isInProgress(this.currentCutscene)) {
            CutsceneService.mouseClicked(this.currentCutscene, event.mouseX, event.mouseY, {battleOrchestratorState: state.battleOrchestratorState});
            return;
        }
    }

    keyEventHappened(state: GameEngineState, event: OrchestratorComponentKeyEvent): void {
        if (event.eventType === OrchestratorComponentKeyEventType.PRESSED) {
            CutsceneService.keyboardPressed(this.currentCutscene, event.keyCode, {battleOrchestratorState: state.battleOrchestratorState})
            return
        }
    }

    uiControlSettings(state: GameEngineState): UIControlSettings {
        return new UIControlSettings({
            scrollCamera: false,
            pauseTimer: true,
        });
    }

    update(state: GameEngineState, graphicsContext: GraphicsBuffer): void {
        if (!isValidValue(this.currentCutscene)) {
            return;
        }

        if (
            CutsceneService.hasLoaded(this.currentCutscene, state.resourceHandler)
            && !CutsceneService.isInProgress(this.currentCutscene)
        ) {
            CutsceneService.setResources(this.currentCutscene, state.resourceHandler);
            CutsceneService.start(
                this.currentCutscene,
                state.resourceHandler,
                {battleOrchestratorState: state.battleOrchestratorState},
            );
        }

        if (CutsceneService.isInProgress(this.currentCutscene)) {
            CutsceneService.update(this.currentCutscene, {battleOrchestratorState: state.battleOrchestratorState});
            CutsceneService.draw(this.currentCutscene, graphicsContext);
        }
    }

    recommendStateChanges(state: GameEngineState): BattleOrchestratorChanges | undefined {
        return {
            displayMap: true,
        }
    }

    reset(state: GameEngineState) {
        this._currentCutsceneId = undefined;
        this._currentCutscene = undefined;
    }

    startCutscene(cutsceneId: string, state: GameEngineState) {
        if (!state.battleOrchestratorState.battleState.cutsceneCollection.cutsceneById[cutsceneId]) {
            throw new Error(`No cutscene with Id ${cutsceneId}`);
        }

        if (this.currentCutscene && CutsceneService.isInProgress(this.currentCutscene)) {
            return;
        }

        this._currentCutsceneId = cutsceneId;
        this._currentCutscene = state.battleOrchestratorState.battleState.cutsceneCollection.cutsceneById[cutsceneId];
        CutsceneService.start(
            this.currentCutscene,
            state.resourceHandler,
            {battleOrchestratorState: state.battleOrchestratorState}
        );
    }
}
