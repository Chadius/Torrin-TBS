import {BattleMissionLoader} from "../orchestratorComponents/battleMissionLoader";
import {OrchestratorComponent, OrchestratorComponentMouseEventType} from "./orchestratorComponent";
import {OrchestratorState} from "./orchestratorState";
import {BattleCutscenePlayer} from "../orchestratorComponents/battleCutscenePlayer";
import {BattleSquaddieSelector} from "../orchestratorComponents/BattleSquaddieSelector";
import {BattleSquaddieMover} from "../orchestratorComponents/battleSquaddieMover";
import {BattleMapDisplay} from "../orchestratorComponents/battleMapDisplay";
import p5 from "p5";

export enum BattleOrchestratorMode {
    UNKNOWN = "UNKNOWN",
    LOADING_MISSION = "LOADING_MISSION",
    CUTSCENE_PLAYER = "CUTSCENE_PLAYER",
    SQUADDIE_SELECTOR = "SQUADDIE_SELECTOR",
    SQUADDIE_MOVER = "SQUADDIE_MOVER",
}

type OrchestratorOptions = {
    missionLoader: BattleMissionLoader,
    cutscenePlayer: BattleCutscenePlayer,
    squaddieSelector: BattleSquaddieSelector,
    squaddieMover: BattleSquaddieMover,
    mapDisplay: BattleMapDisplay,
}

export class Orchestrator {
    mode: BattleOrchestratorMode;

    missionLoader: BattleMissionLoader;
    cutscenePlayer: BattleCutscenePlayer;
    squaddieSelector: BattleSquaddieSelector;
    squaddieMover: BattleSquaddieMover;
    mapDisplay: BattleMapDisplay;

    constructor(options: OrchestratorOptions) {
        this.mode = BattleOrchestratorMode.UNKNOWN;
        this.missionLoader = options.missionLoader;
        this.cutscenePlayer = options.cutscenePlayer;
        this.squaddieSelector = options.squaddieSelector;
        this.squaddieMover = options.squaddieMover;
        this.mapDisplay = options.mapDisplay;
    }

    public getCurrentComponent(): OrchestratorComponent {
        switch (this.mode) {
            case BattleOrchestratorMode.LOADING_MISSION:
                return this.missionLoader;
            case BattleOrchestratorMode.CUTSCENE_PLAYER:
                return this.cutscenePlayer;
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
        ];

        if (modesToDisplayMap.includes(this.mode)) {
            this.displayBattleMap(state, p);
        }

        switch(this.mode) {
            case BattleOrchestratorMode.UNKNOWN:
                this.updateUnknown(state);
                break;
            case BattleOrchestratorMode.LOADING_MISSION:
                this.updateLoadingMission(state);
                break;
            case BattleOrchestratorMode.CUTSCENE_PLAYER:
                this.updateCutscenePlayer(state, p);
                break;
            case BattleOrchestratorMode.SQUADDIE_SELECTOR:
                this.updateSquaddieSelector(state, p);
                break;
            case BattleOrchestratorMode.SQUADDIE_MOVER:
                this.updateSquaddieMover(state, p);
                break;
            default:
                break;
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

    private updateLoadingMission(state: OrchestratorState) {
        this.missionLoader.update(state);
        if (this.missionLoader.hasCompleted(state)) {
            this.mode = BattleOrchestratorMode.CUTSCENE_PLAYER;
            state.displayMap = true;
        }
    }

    private updateCutscenePlayer(state: OrchestratorState, p: p5) {
        this.cutscenePlayer.update(state, p);
        if (this.cutscenePlayer.hasCompleted(state)) {
            this.mode = BattleOrchestratorMode.SQUADDIE_SELECTOR;
        }
    }

    private updateSquaddieSelector(state: OrchestratorState, p: p5) {
        this.squaddieSelector.update(state, p);
        if (this.squaddieSelector.hasCompleted(state)) {
            this.mode = BattleOrchestratorMode.SQUADDIE_MOVER;
        }
    }

    private updateSquaddieMover(state: OrchestratorState, p: p5) {
        this.squaddieMover.update(state, p);
        if (this.squaddieMover.hasCompleted(state)) {
            this.mode = BattleOrchestratorMode.SQUADDIE_SELECTOR;
        }
    }

    private displayBattleMap(state: OrchestratorState, p: p5) {
        if (state.displayMap === true) {
            this.mapDisplay.update(state, p);
        }
    }
}