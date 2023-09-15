import {ResourceHandler} from "../../resource/resourceHandler";
import {MissionMap} from "../../missionMap/missionMap";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {Pathfinder} from "../../hexMap/pathfinder/pathfinder";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {BattlePhase, BattlePhaseTracker} from "../orchestratorComponents/battlePhaseTracker";
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
    SquaddieInstructionInProgress
} from "../history/squaddieInstructionInProgress";
import {MissionObjective} from "../missionResult/missionObjective";
import {BattleGameBoard} from "./battleGameBoard";
import {MissionCutsceneCollection} from "./missionCutsceneCollection";

export class BattleOrchestratorState {
    resourceHandler: ResourceHandler;
    missionMap: MissionMap;
    hexMap: TerrainTileMap;
    pathfinder: Pathfinder;
    squaddieRepository: BattleSquaddieRepository;
    battlePhaseTracker: BattlePhaseTracker;
    camera: BattleCamera;
    battleSquaddieSelectedHUD: BattleSquaddieSelectedHUD;
    squaddieMovePath?: SearchPath;
    battlePhaseState: BattlePhaseState;
    battleEventRecording: Recording;
    teamStrategyByAffiliation: { [key in SquaddieAffiliation]?: TeamStrategy[] }
    private readonly _squaddieCurrentlyActing: SquaddieInstructionInProgress;

    constructor(options: {
        cutsceneCollection?: MissionCutsceneCollection,
        objectives?: MissionObjective[],
        bannerDisplayAnimationStartTime?: number;
        bannerAffiliationToShow?: BattlePhase;
        resourceHandler?: ResourceHandler;
        missionMap?: MissionMap;
        hexMap?: TerrainTileMap;
        pathfinder?: Pathfinder;
        squaddieRepo?: BattleSquaddieRepository;
        battlePhaseTracker?: BattlePhaseTracker;
        camera?: BattleCamera;
        battleSquaddieSelectedHUD?: BattleSquaddieSelectedHUD;
        squaddieMovePath?: SearchPath;
        battlePhaseState?: BattlePhaseState;
        squaddieCurrentlyActing?: SquaddieInstructionInProgress;
        battleEventRecording?: Recording;
        teamStrategyByAffiliation?: { [key in SquaddieAffiliation]?: TeamStrategy[] }
    }) {

        const {
            objectives,
            cutsceneCollection,
            bannerDisplayAnimationStartTime,
            bannerAffiliationToShow,
            resourceHandler,
            missionMap,
            hexMap,
            pathfinder,
            squaddieRepo,
            battlePhaseTracker,
            camera,
            battleSquaddieSelectedHUD,
            squaddieMovePath,
            battlePhaseState,
            squaddieCurrentlyActing,
            battleEventRecording,
            teamStrategyByAffiliation,
        } = options;

        this.resourceHandler = options.resourceHandler;
        this.missionMap = options.missionMap;
        this.hexMap = options.hexMap || (this.missionMap && this.missionMap.terrainTileMap) || new TerrainTileMap({movementCost: ["1 "]});
        this.pathfinder = options.pathfinder;
        this.squaddieRepository = options.squaddieRepo;
        this.battlePhaseTracker = options.battlePhaseTracker || new BattlePhaseTracker();
        this.camera = options.camera || new BattleCamera();
        this.squaddieMovePath = options.squaddieMovePath || undefined;
        this.battleSquaddieSelectedHUD = options.battleSquaddieSelectedHUD || new BattleSquaddieSelectedHUD();
        this.battlePhaseState = options.battlePhaseState || {
            bannerPhaseToShow: BattlePhase.UNKNOWN,
        };
        this._squaddieCurrentlyActing = options.squaddieCurrentlyActing || DefaultSquaddieInstructionInProgress();
        this.battleEventRecording = options.battleEventRecording || new Recording({});

        this.copyTeamStrategyByAffiliation(options.teamStrategyByAffiliation);

        this._gameBoard = new BattleGameBoard({
            objectives,
            cutsceneCollection,
        })
    }

    get squaddieCurrentlyActing(): SquaddieInstructionInProgress {
        return this._squaddieCurrentlyActing;
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
