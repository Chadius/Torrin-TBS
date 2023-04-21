import {BattleMissionLoader} from "../orchestratorComponents/battleMissionLoader";
import {OrchestratorChanges, OrchestratorComponent, OrchestratorComponentMouseEventType} from "./orchestratorComponent";
import {OrchestratorState} from "./orchestratorState";
import {BattleCutscenePlayer} from "../orchestratorComponents/battleCutscenePlayer";
import {BattleSquaddieSelector} from "../orchestratorComponents/BattleSquaddieSelector";
import {BattleSquaddieMover} from "../orchestratorComponents/battleSquaddieMover";
import {BattleMapDisplay} from "../orchestratorComponents/battleMapDisplay";
import p5 from "p5";
import {BattlePhaseController} from "../orchestratorComponents/battlePhaseController";

export enum BattleOrchestratorMode {
    UNKNOWN = "UNKNOWN",
    LOADING_MISSION = "LOADING_MISSION",
    CUTSCENE_PLAYER = "CUTSCENE_PLAYER",
    PHASE_CONTROLLER = "PHASE_CONTROLLER",
    SQUADDIE_SELECTOR = "SQUADDIE_SELECTOR",
    SQUADDIE_MOVER = "SQUADDIE_MOVER",
}

type OrchestratorOptions = {
    missionLoader: BattleMissionLoader,
    cutscenePlayer: BattleCutscenePlayer,
    squaddieSelector: BattleSquaddieSelector,
    squaddieMover: BattleSquaddieMover,
    mapDisplay: BattleMapDisplay,
    phaseController: BattlePhaseController,
}

export class Orchestrator {
    mode: BattleOrchestratorMode;

    missionLoader: BattleMissionLoader;
    cutscenePlayer: BattleCutscenePlayer;
    squaddieSelector: BattleSquaddieSelector;
    squaddieMover: BattleSquaddieMover;
    mapDisplay: BattleMapDisplay;
    phaseController: BattlePhaseController;

    constructor(options: OrchestratorOptions) {
        this.mode = BattleOrchestratorMode.UNKNOWN;
        this.missionLoader = options.missionLoader;
        this.cutscenePlayer = options.cutscenePlayer;
        this.squaddieSelector = options.squaddieSelector;
        this.squaddieMover = options.squaddieMover;
        this.mapDisplay = options.mapDisplay;
        this.phaseController = options.phaseController;
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
            case BattleOrchestratorMode.SQUADDIE_MOVER:
                return this.squaddieMover;
            default:
                return undefined;
        }
    }

    public getCurrentMode(): BattleOrchestratorMode {
        return this.mode;
    }

    public update(state: OrchestratorState, p?: p5) {
        const modesToDisplayMap = [
            BattleOrchestratorMode.CUTSCENE_PLAYER,
            BattleOrchestratorMode.SQUADDIE_SELECTOR,
            BattleOrchestratorMode.SQUADDIE_MOVER,
            BattleOrchestratorMode.PHASE_CONTROLLER,
        ];

        if (modesToDisplayMap.includes(this.mode)) {
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
            case BattleOrchestratorMode.SQUADDIE_MOVER:
                this.updateComponent(state, this.squaddieMover, p, BattleOrchestratorMode.PHASE_CONTROLLER);
                break;
            default:
                break;
        }
    }

    public updateComponent(state: OrchestratorState, currentComponent: OrchestratorComponent, p: p5 | undefined, defaultNextMode: BattleOrchestratorMode) {
        currentComponent.update(state, p);
        if (currentComponent.hasCompleted(state)) {
            const orchestrationChanges: OrchestratorChanges = currentComponent.recommendStateChanges(state);
            this.mode = orchestrationChanges.nextMode || defaultNextMode;

            state.displayMap = orchestrationChanges.displayMap !== undefined
                ? orchestrationChanges.displayMap
                : true;
            currentComponent.reset();
        }
    }

    public mouseClicked(state: OrchestratorState, mouseX: number, mouseY: number) {
        this.getCurrentComponent().mouseEventHappened(
            state,
            {
                eventType: OrchestratorComponentMouseEventType.CLICKED,
                mouseX,
                mouseY,
            }
        )
    }

    public mouseMoved(state: OrchestratorState, mouseX: number, mouseY: number) {
        this.getCurrentComponent().mouseEventHappened(
            state,
            {
                eventType: OrchestratorComponentMouseEventType.MOVED,
                mouseX,
                mouseY,
            }
        )
    }

    private updateUnknown(_: OrchestratorState) {
        this.mode = BattleOrchestratorMode.LOADING_MISSION;
    }

    private displayBattleMap(state: OrchestratorState, p: p5) {
        if (state.displayMap === true) {
            this.mapDisplay.update(state, p);
        }
    }
}