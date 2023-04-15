import {ResourceHandler} from "../../resource/resourceHandler";
import {MissionMap} from "../../missionMap/missionMap";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {Pathfinder} from "../../hexMap/pathfinder/pathfinder";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {BattlePhaseTracker} from "../battlePhaseTracker";
import {BattleCamera} from "../battleCamera";
import {Cutscene} from "../../cutscene/cutscene";

export type OrchestratorStateOptions = {
    displayMap: boolean;
    resourceHandler: ResourceHandler;
    missionMap: MissionMap;
    hexMap: TerrainTileMap;
    pathfinder: Pathfinder;
    squaddieRepo: BattleSquaddieRepository;
    battlePhaseTracker: BattlePhaseTracker;
    camera: BattleCamera;
    currentCutscene: Cutscene;
}

export class OrchestratorState {
    resourceHandler: ResourceHandler;
    missionMap: MissionMap;
    hexMap: TerrainTileMap;
    displayMap: boolean;
    pathfinder: Pathfinder;
    squaddieRepo: BattleSquaddieRepository;
    battlePhaseTracker: BattlePhaseTracker;
    camera: BattleCamera;
    currentCutscene: Cutscene;

    constructor(options: Partial<OrchestratorStateOptions> = {}) {
        this.displayMap = options.displayMap || false;
        this.resourceHandler = options.resourceHandler;
        this.hexMap = options.hexMap;
        this.displayMap = options.displayMap;
        this.pathfinder = options.pathfinder;
        this.squaddieRepo = options.squaddieRepo;
        this.battlePhaseTracker = options.battlePhaseTracker || new BattlePhaseTracker();
        this.camera = options.camera || new BattleCamera();
        this.currentCutscene = options.currentCutscene;
    }
}