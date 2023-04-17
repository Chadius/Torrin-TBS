import {ResourceHandler} from "../../resource/resourceHandler";
import {MissionMap} from "../../missionMap/missionMap";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {Pathfinder} from "../../hexMap/pathfinder/pathfinder";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {BattlePhaseTracker} from "../orchestratorComponents/battlePhaseTracker";
import {BattleCamera} from "../battleCamera";
import {Cutscene} from "../../cutscene/cutscene";
import {BattleSquaddieSelectedHUD} from "../battleSquaddieSelectedHUD";
import {BattleSquaddieUIInput, BattleSquaddieUISelectionState} from "../battleSquaddieUIInput";
import {SearchPath} from "../../hexMap/pathfinder/searchPath";
import {HexCoordinate} from "../../hexMap/hexGrid";

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
    battleSquaddieSelectedHUD: BattleSquaddieSelectedHUD;
    battleSquaddieUIInput: BattleSquaddieUIInput;
    animationTimer: number;
    squaddieMovePath: SearchPath;
    clickedHexCoordinate: HexCoordinate;
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
    battleSquaddieSelectedHUD: BattleSquaddieSelectedHUD;
    battleSquaddieUIInput: BattleSquaddieUIInput;
    animationTimer: number;
    squaddieMovePath?: SearchPath;
    clickedHexCoordinate?: HexCoordinate;

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
        this.animationTimer = options.animationTimer || 0;
        this.squaddieMovePath = options.squaddieMovePath || undefined;
        this.clickedHexCoordinate = options.clickedHexCoordinate || undefined;

        this.battleSquaddieUIInput = options.battleSquaddieUIInput || new BattleSquaddieUIInput({
            selectionState: BattleSquaddieUISelectionState.NO_SQUADDIE_SELECTED,
            missionMap: this.missionMap,
            squaddieRepository: this.squaddieRepo,
        });
        this.battleSquaddieSelectedHUD = options.battleSquaddieSelectedHUD || new BattleSquaddieSelectedHUD({
            missionMap: this.missionMap,
            squaddieRepository: this.squaddieRepo,
            resourceHandler: this.resourceHandler,
        });
    }
}