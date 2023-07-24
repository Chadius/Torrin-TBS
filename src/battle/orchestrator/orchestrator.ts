import {BattleMissionLoader} from "../orchestratorComponents/battleMissionLoader";
import {
    OrchestratorChanges,
    OrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentKeyEventType,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType
} from "./orchestratorComponent";
import {OrchestratorState} from "./orchestratorState";
import {BattleCutscenePlayer} from "../orchestratorComponents/battleCutscenePlayer";
import {BattleSquaddieSelector} from "../orchestratorComponents/battleSquaddieSelector";
import {BattleSquaddieMover} from "../orchestratorComponents/battleSquaddieMover";
import {BattleMapDisplay} from "../orchestratorComponents/battleMapDisplay";
import p5 from "p5";
import {BattlePhaseController} from "../orchestratorComponents/battlePhaseController";
import {BattleSquaddieMapActivity} from "../orchestratorComponents/battleSquaddieMapActivity";
import {BattleSquaddieTarget} from "../orchestratorComponents/battleSquaddieTarget";
import {BattleSquaddieSquaddieActivity} from "../orchestratorComponents/battleSquaddieSquaddieActivity";
import {UIControlSettings} from "./uiControlSettings";

export enum BattleOrchestratorMode {
    UNKNOWN = "UNKNOWN",
    LOADING_MISSION = "LOADING_MISSION",
    CUTSCENE_PLAYER = "CUTSCENE_PLAYER",
    PHASE_CONTROLLER = "PHASE_CONTROLLER",
    SQUADDIE_SELECTOR = "SQUADDIE_SELECTOR",
    SQUADDIE_TARGET = "SQUADDIE_TARGET",
    SQUADDIE_MOVER = "SQUADDIE_MOVER",
    SQUADDIE_MAP_ACTIVITY = "SQUADDIE_MAP_ACTIVITY",
    SQUADDIE_SQUADDIE_ACTIVITY = "SQUADDIE_SQUADDIE_ACTIVITY",
}

export class Orchestrator {
    get uiControlSettings(): UIControlSettings {
        return this._uiControlSettings;
    }

    mode: BattleOrchestratorMode;
    private _uiControlSettings: UIControlSettings;

    missionLoader: BattleMissionLoader;
    cutscenePlayer: BattleCutscenePlayer;
    squaddieSelector: BattleSquaddieSelector;
    squaddieTarget: BattleSquaddieTarget;
    squaddieMapActivity: BattleSquaddieMapActivity;
    squaddieSquaddieActivity: BattleSquaddieSquaddieActivity;
    squaddieMover: BattleSquaddieMover;
    mapDisplay: BattleMapDisplay;
    phaseController: BattlePhaseController;

    constructor({
                    cutscenePlayer,
                    mapDisplay,
                    missionLoader,
                    phaseController,
                    squaddieMapActivity,
                    squaddieMover,
                    squaddieSelector,
                    squaddieSquaddieActivity,
                    squaddieTarget,
                }: {
        missionLoader: BattleMissionLoader,
        cutscenePlayer: BattleCutscenePlayer,
        squaddieSelector: BattleSquaddieSelector,
        squaddieMapActivity: BattleSquaddieMapActivity,
        squaddieSquaddieActivity: BattleSquaddieSquaddieActivity,
        squaddieMover: BattleSquaddieMover,
        squaddieTarget: BattleSquaddieTarget,
        mapDisplay: BattleMapDisplay,
        phaseController: BattlePhaseController,
    }) {
        this.mode = BattleOrchestratorMode.UNKNOWN;
        this._uiControlSettings = new UIControlSettings({});

        this.missionLoader = missionLoader;
        this.cutscenePlayer = cutscenePlayer;
        this.squaddieSelector = squaddieSelector;
        this.squaddieTarget = squaddieTarget;
        this.squaddieMapActivity = squaddieMapActivity;
        this.squaddieMover = squaddieMover;
        this.mapDisplay = mapDisplay;
        this.phaseController = phaseController;
        this.squaddieSquaddieActivity = squaddieSquaddieActivity;
    }

    public getCurrentComponent(): OrchestratorComponent {
        switch (this.mode) {
            case BattleOrchestratorMode.LOADING_MISSION:
                return this.missionLoader;
            case BattleOrchestratorMode.CUTSCENE_PLAYER:
                return this.cutscenePlayer;
            case BattleOrchestratorMode.PHASE_CONTROLLER:
                return this.phaseController;
            case BattleOrchestratorMode.SQUADDIE_SELECTOR:
                return this.squaddieSelector;
            case BattleOrchestratorMode.SQUADDIE_TARGET:
                return this.squaddieTarget;
            case BattleOrchestratorMode.SQUADDIE_MAP_ACTIVITY:
                return this.squaddieMapActivity;
            case BattleOrchestratorMode.SQUADDIE_SQUADDIE_ACTIVITY:
                return this.squaddieSquaddieActivity;
            case BattleOrchestratorMode.SQUADDIE_MOVER:
                return this.squaddieMover;
            default:
                return undefined;
        }
    }

    public getCurrentMode(): BattleOrchestratorMode {
        return this.mode;
    }

    public update(state: OrchestratorState, p: p5) {
        if (this.uiControlSettings.displayBattleMap === true && this.mode !== BattleOrchestratorMode.LOADING_MISSION) {
            this.displayBattleMap(state, p);
        }

        switch (this.mode) {
            case BattleOrchestratorMode.UNKNOWN:
                this.updateUnknown(state);
                break;
            case BattleOrchestratorMode.LOADING_MISSION:
                this.updateComponent(state, this.missionLoader, p, BattleOrchestratorMode.CUTSCENE_PLAYER);
                break;
            case BattleOrchestratorMode.CUTSCENE_PLAYER:
                this.updateComponent(state, this.cutscenePlayer, p, BattleOrchestratorMode.PHASE_CONTROLLER);
                break;
            case BattleOrchestratorMode.PHASE_CONTROLLER:
                this.updateComponent(state, this.phaseController, p, BattleOrchestratorMode.SQUADDIE_SELECTOR);
                break;
            case BattleOrchestratorMode.SQUADDIE_SELECTOR:
                this.updateComponent(state, this.squaddieSelector, p, BattleOrchestratorMode.SQUADDIE_MOVER);
                break;
            case BattleOrchestratorMode.SQUADDIE_MAP_ACTIVITY:
                this.updateComponent(state, this.squaddieMapActivity, p, BattleOrchestratorMode.PHASE_CONTROLLER);
                break;
            case BattleOrchestratorMode.SQUADDIE_SQUADDIE_ACTIVITY:
                this.updateComponent(state, this.squaddieSquaddieActivity, p, BattleOrchestratorMode.PHASE_CONTROLLER);
                break;
            case BattleOrchestratorMode.SQUADDIE_MOVER:
                this.updateComponent(state, this.squaddieMover, p, BattleOrchestratorMode.PHASE_CONTROLLER);
                break;
            case BattleOrchestratorMode.SQUADDIE_TARGET:
                this.updateComponent(state, this.squaddieTarget, p, BattleOrchestratorMode.SQUADDIE_SELECTOR);
                break;
            default:
                throw new Error(`update does not know about ${this.mode}, cannot switch mode`);
        }
    }

    public updateComponent(state: OrchestratorState, currentComponent: OrchestratorComponent, p: p5 | undefined, defaultNextMode: BattleOrchestratorMode) {
        currentComponent.update(state, p);
        const newUIControlSettingsChanges = currentComponent.uiControlSettings(state);
        this.uiControlSettings.update(newUIControlSettingsChanges);

        if (currentComponent.hasCompleted(state)) {
            const orchestrationChanges: OrchestratorChanges = currentComponent.recommendStateChanges(state);
            this.mode = orchestrationChanges.nextMode || defaultNextMode;
            currentComponent.reset(state);
        }
    }

    public mouseClicked(state: OrchestratorState, mouseX: number, mouseY: number) {
        const mouseEvent: OrchestratorComponentMouseEvent = {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX,
            mouseY,
        };

        this.getCurrentComponent().mouseEventHappened(
            state,
            mouseEvent
        )

        if (
            this.uiControlSettings.letMouseScrollCamera === true
        ) {
            this.mapDisplay.mouseEventHappened(state, mouseEvent);
        }
    }

    public mouseMoved(state: OrchestratorState, mouseX: number, mouseY: number) {
        const mouseEvent: OrchestratorComponentMouseEvent = {
            eventType: OrchestratorComponentMouseEventType.MOVED,
            mouseX,
            mouseY,
        };

        this.getCurrentComponent().mouseEventHappened(state, mouseEvent);

        if (
            this.uiControlSettings.letMouseScrollCamera === true
        ) {
            this.mapDisplay.mouseEventHappened(state, mouseEvent);
        }
    }

    public keyPressed(state: OrchestratorState, keyCode: number) {
        const keyEvent: OrchestratorComponentKeyEvent = {
            eventType: OrchestratorComponentKeyEventType.PRESSED,
            keyCode,
        }
        this.getCurrentComponent().keyEventHappened(state, keyEvent);

        if (
            this.uiControlSettings.displayBattleMap === true
        ) {
            this.mapDisplay.keyEventHappened(state, keyEvent);
        }
    }

    private updateUnknown(_: OrchestratorState) {
        this.mode = BattleOrchestratorMode.LOADING_MISSION;
    }

    private displayBattleMap(state: OrchestratorState, p: p5) {
        this.mapDisplay.update(state, p);
    }
}
