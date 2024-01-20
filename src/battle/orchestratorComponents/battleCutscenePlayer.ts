import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType
} from "../orchestrator/battleOrchestratorComponent";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {UIControlSettings} from "../orchestrator/uiControlSettings";
import {Cutscene, CutsceneService} from "../../cutscene/cutscene";
import {GraphicsContext} from "../../utils/graphics/graphicsContext";
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
    }

    uiControlSettings(state: GameEngineState): UIControlSettings {
        return new UIControlSettings({
            scrollCamera: false,
            pauseTimer: true,
        });
    }

    update(state: GameEngineState, graphicsContext: GraphicsContext): void {
        if (!isValidValue(this.currentCutscene)) {
            return;
        }

        if (
            CutsceneService.hasLoaded(this.currentCutscene, state.battleOrchestratorState.resourceHandler)
            && !CutsceneService.isInProgress(this.currentCutscene)
        ) {
            CutsceneService.setResources(this.currentCutscene, state.battleOrchestratorState.resourceHandler);
            CutsceneService.start(
                this.currentCutscene,
                state.battleOrchestratorState.resourceHandler,
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

    startCutscene(cutsceneId: string, state: BattleOrchestratorState) {
        if (!state.battleState.cutsceneCollection.cutsceneById[cutsceneId]) {
            throw new Error(`No cutscene with Id ${cutsceneId}`);
        }

        if (this.currentCutscene && CutsceneService.isInProgress(this.currentCutscene)) {
            return;
        }

        this._currentCutsceneId = cutsceneId;
        this._currentCutscene = state.battleState.cutsceneCollection.cutsceneById[cutsceneId];
        CutsceneService.start(
            this.currentCutscene,
            state.resourceHandler,
            {battleOrchestratorState: state}
        );
    }
}
