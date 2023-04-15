import {BattleMissionLoader} from "../battleMissionLoader";
import {OrchestratorComponent} from "./orchestratorComponent";
import {BattleResourceLoader} from "../battleResourceLoader";
import {OrchestratorState} from "./orchestratorState";
import {BattleCutscenePlayer} from "../battleCutscenePlayer";
import {BattleSquaddieSelector} from "../BattleSquaddieSelector";
import {BattleSquaddieMover} from "../battleSquaddieMover";

export enum BattleOrchestratorMode {
    UNKNOWN = "UNKNOWN",
    LOADING_MISSION = "LOADING_MISSION",
    LOADING_RESOURCES = "LOADING_RESOURCES",
    CUTSCENE_PLAYER = "CUTSCENE_PLAYER",
    SQUADDIE_SELECTOR = "SQUADDIE_SELECTOR",
    SQUADDIE_MOVER = "SQUADDIE_MOVER",
}

type OrchestratorOptions = {
    missionLoader: BattleMissionLoader,
    resourceLoader: BattleResourceLoader,
    cutscenePlayer: BattleCutscenePlayer,
    squaddieSelector: BattleSquaddieSelector,
    squaddieMover: BattleSquaddieMover,
}

export class Orchestrator {
    mode: BattleOrchestratorMode;

    missionLoader: BattleMissionLoader;
    resourceLoader: BattleResourceLoader;
    cutscenePlayer: BattleCutscenePlayer;
    squaddieSelector: BattleSquaddieSelector;
    squaddieMover: BattleSquaddieMover;

    constructor(options: OrchestratorOptions) {
        this.mode = BattleOrchestratorMode.UNKNOWN;
        this.missionLoader = options.missionLoader;
        this.resourceLoader = options.resourceLoader;
        this.cutscenePlayer = options.cutscenePlayer;
        this.squaddieSelector = options.squaddieSelector;
        this.squaddieMover = options.squaddieMover;
    }

    public getCurrentComponent(): OrchestratorComponent {
        switch (this.mode) {
            case BattleOrchestratorMode.LOADING_MISSION:
                return this.missionLoader;
            case BattleOrchestratorMode.LOADING_RESOURCES:
                return this.resourceLoader;
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

    public update(state: OrchestratorState) {
        switch(this.mode) {
            case BattleOrchestratorMode.UNKNOWN:
                return this.updateUnknown(state);
            case BattleOrchestratorMode.LOADING_MISSION:
                return this.updateLoadingMission(state);
            case BattleOrchestratorMode.LOADING_RESOURCES:
                return this.updateLoadingResources(state);
            case BattleOrchestratorMode.CUTSCENE_PLAYER:
                return this.updateCutscenePlayer(state);
            case BattleOrchestratorMode.SQUADDIE_SELECTOR:
                return this.updateSquaddieSelector(state);
            case BattleOrchestratorMode.SQUADDIE_MOVER:
                return this.updateSquaddieMover(state);
            default:
                return;
        }
    }

    private updateUnknown(state: OrchestratorState) {
        this.mode = BattleOrchestratorMode.LOADING_MISSION;
    }

    private updateLoadingMission(state: OrchestratorState) {
        this.missionLoader.update(state);
        if (this.missionLoader.hasCompleted()) {
            this.mode = BattleOrchestratorMode.LOADING_RESOURCES;
        }
    }

    private updateLoadingResources(state: OrchestratorState) {
        this.resourceLoader.update(state);
        if (this.resourceLoader.hasCompleted()) {
            this.mode = BattleOrchestratorMode.CUTSCENE_PLAYER;
        }
    }

    private updateCutscenePlayer(state: OrchestratorState) {
        this.cutscenePlayer.update(state);
        if (this.cutscenePlayer.hasCompleted()) {
            this.mode = BattleOrchestratorMode.SQUADDIE_SELECTOR;
        }
    }

    private updateSquaddieSelector(state: OrchestratorState) {
        this.squaddieSelector.update(state);
        if (this.squaddieSelector.hasCompleted()) {
            this.mode = BattleOrchestratorMode.SQUADDIE_MOVER;
        }
    }

    private updateSquaddieMover(state: OrchestratorState) {
        this.squaddieMover.update(state);
        if (this.squaddieMover.hasCompleted()) {
            this.mode = BattleOrchestratorMode.SQUADDIE_SELECTOR;
        }
    }
}