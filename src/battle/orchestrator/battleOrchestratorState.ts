import {ResourceHandler} from "../../resource/resourceHandler";
import {MissionMap} from "../../missionMap/missionMap";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {Pathfinder} from "../../hexMap/pathfinder/pathfinder";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {BattlePhase} from "../orchestratorComponents/battlePhaseTracker";
import {BattleCamera} from "../battleCamera";
import {BattleSquaddieSelectedHUD} from "../battleSquaddieSelectedHUD";
import {SearchPath} from "../../hexMap/pathfinder/searchPath";
import {BattlePhaseState} from "../orchestratorComponents/battlePhaseController";
import {Recording} from "../history/recording";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {TeamStrategy} from "../teamStrategy/teamStrategy";
import {EndTurnTeamStrategy} from "../teamStrategy/endTurn";
import {
    DefaultSquaddieInstructionInProgress,
    SquaddieInstructionInProgress,
} from "../history/squaddieInstructionInProgress";
import {MissionObjective} from "../missionResult/missionObjective";
import {BattleGameBoard} from "./battleGameBoard";
import {MissionCutsceneCollection} from "./missionCutsceneCollection";
import {BattleSquaddieTeam} from "../battleSquaddieTeam";
import {CutsceneTrigger} from "../../cutscene/cutsceneTrigger";
import {MissionStatistics, MissionStatisticsHandler} from "../missionStatistics/missionStatistics";

export class BattleOrchestratorState {
    resourceHandler: ResourceHandler;
    squaddieRepository: BattleSquaddieRepository;
    missionMap: MissionMap;
    hexMap: TerrainTileMap;
    teamsByAffiliation: { [affiliation in SquaddieAffiliation]?: BattleSquaddieTeam }
    teamStrategyByAffiliation: { [key in SquaddieAffiliation]?: TeamStrategy[] };
    battlePhaseState: BattlePhaseState;
    pathfinder: Pathfinder;
    squaddieMovePath?: SearchPath;
    camera: BattleCamera;
    battleSquaddieSelectedHUD: BattleSquaddieSelectedHUD;
    battleEventRecording: Recording;

    constructor(options: {
        cutsceneCollection?: MissionCutsceneCollection,
        cutsceneTriggers?: CutsceneTrigger[],
        objectives?: MissionObjective[],
        bannerDisplayAnimationStartTime?: number;
        bannerAffiliationToShow?: BattlePhase;
        resourceHandler?: ResourceHandler;
        missionMap?: MissionMap;
        hexMap?: TerrainTileMap;
        pathfinder?: Pathfinder;
        squaddieRepository?: BattleSquaddieRepository;
        camera?: BattleCamera;
        battleSquaddieSelectedHUD?: BattleSquaddieSelectedHUD;
        squaddieMovePath?: SearchPath;
        battlePhaseState?: BattlePhaseState;
        squaddieCurrentlyActing?: SquaddieInstructionInProgress;
        battleEventRecording?: Recording;
        teamStrategyByAffiliation?: { [key in SquaddieAffiliation]?: TeamStrategy[] };
        teamsByAffiliation?: { [affiliation in SquaddieAffiliation]?: BattleSquaddieTeam };

        missionStatistics?: MissionStatistics;
    }) {

        const {
            objectives,
            cutsceneCollection,
            cutsceneTriggers,
            bannerDisplayAnimationStartTime,
            bannerAffiliationToShow,
            resourceHandler,
            missionMap,
            hexMap,
            pathfinder,
            squaddieRepository,
            camera,
            battleSquaddieSelectedHUD,
            squaddieMovePath,
            battlePhaseState,
            squaddieCurrentlyActing,
            battleEventRecording,
            teamStrategyByAffiliation,
            teamsByAffiliation,
            missionStatistics
        } = options;

        this.resourceHandler = options.resourceHandler;
        this.squaddieRepository = options.squaddieRepository;

        this.missionMap = options.missionMap;
        this.hexMap = options.hexMap || (this.missionMap && this.missionMap.terrainTileMap) || new TerrainTileMap({movementCost: ["1 "]});

        this.teamsByAffiliation = {...teamsByAffiliation};
        this.copyTeamStrategyByAffiliation(options.teamStrategyByAffiliation);
        this.battlePhaseState = options.battlePhaseState || {
            currentAffiliation: BattlePhase.UNKNOWN,
            turnCount: 0,
        };

        this.pathfinder = options.pathfinder;
        this.squaddieMovePath = options.squaddieMovePath || undefined;
        this._squaddieCurrentlyActing = options.squaddieCurrentlyActing || DefaultSquaddieInstructionInProgress();

        this.camera = options.camera || new BattleCamera();
        this.battleSquaddieSelectedHUD = options.battleSquaddieSelectedHUD || new BattleSquaddieSelectedHUD();

        this._missionStatistics = missionStatistics || MissionStatisticsHandler.new();
        this.battleEventRecording = options.battleEventRecording || new Recording({});

        this._gameBoard = new BattleGameBoard({
            objectives,
            cutsceneCollection,
            cutsceneTriggers,
        })
    }

    private _squaddieCurrentlyActing: SquaddieInstructionInProgress;

    get squaddieCurrentlyActing(): SquaddieInstructionInProgress {
        return this._squaddieCurrentlyActing;
    }

    set squaddieCurrentlyActing(value: SquaddieInstructionInProgress) {
        this._squaddieCurrentlyActing = value;
    }

    private _missionStatistics: MissionStatistics;

    get missionStatistics(): MissionStatistics {
        return this._missionStatistics;
    }

    get cutsceneTriggers(): CutsceneTrigger[] {
        return this.gameBoard.cutsceneTriggers;
    }

    get cutsceneCollection(): MissionCutsceneCollection {
        return this._gameBoard.cutsceneCollection;
    }

    get objectives(): MissionObjective[] {
        return this.gameBoard.objectives;
    }

    private _gameBoard: BattleGameBoard;

    get gameBoard(): BattleGameBoard {
        return this._gameBoard;
    }

    getCurrentTeam(): BattleSquaddieTeam {
        return this.teamsByAffiliation[this.battlePhaseState.currentAffiliation];
    }

    private copyTeamStrategyByAffiliation(teamStrategyByAffiliation: { [key in SquaddieAffiliation]?: TeamStrategy[] }) {
        this.teamStrategyByAffiliation = {...teamStrategyByAffiliation};
        [
            SquaddieAffiliation.PLAYER,
            SquaddieAffiliation.ENEMY,
            SquaddieAffiliation.ALLY,
            SquaddieAffiliation.NONE,
        ].forEach((affiliation) => {
            if (this.teamStrategyByAffiliation[affiliation]) {
                return;
            }
            if (affiliation === SquaddieAffiliation.PLAYER) {
                return;
            }
            this.teamStrategyByAffiliation[affiliation] = [new EndTurnTeamStrategy()];
        });
    }
}
