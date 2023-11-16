import {ResourceHandler} from "../../resource/resourceHandler";
import {MissionMap} from "../../missionMap/missionMap";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {BattlePhase} from "../orchestratorComponents/battlePhaseTracker";
import {BattleCamera} from "../battleCamera";
import {BattleSquaddieSelectedHUD} from "../battleSquaddieSelectedHUD";
import {SearchPath} from "../../hexMap/pathfinder/searchPath";
import {BattlePhaseState} from "../orchestratorComponents/battlePhaseController";
import {Recording} from "../history/recording";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
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
import {TeamStrategy} from "../teamStrategy/teamStrategy";
import {MissionCompletionStatus} from "../missionResult/missionCompletionStatus";

export class BattleOrchestratorState {
    resourceHandler: ResourceHandler;
    squaddieRepository: BattleSquaddieRepository;
    missionMap: MissionMap;
    teamsByAffiliation: { [affiliation in SquaddieAffiliation]?: BattleSquaddieTeam }
    teamStrategyByAffiliation: { [key in SquaddieAffiliation]?: TeamStrategy[] };
    battlePhaseState: BattlePhaseState;
    squaddieMovePath?: SearchPath;
    camera: BattleCamera;
    battleSquaddieSelectedHUD: BattleSquaddieSelectedHUD;
    battleEventRecording: Recording;
    gameSaveFlags: {
        errorDuringLoading: boolean;
        errorDuringSaving: boolean;
        loadingInProgress: boolean;
        savingInProgress: boolean;
        loadRequested: boolean;
    }
    missionCompletionStatus: MissionCompletionStatus;
    missionStatistics: MissionStatistics;

    constructor(options: {
        cutsceneCollection?: MissionCutsceneCollection;
        cutsceneTriggers?: CutsceneTrigger[];
        objectives?: MissionObjective[];
        resourceHandler?: ResourceHandler;
        missionMap?: MissionMap;
        squaddieRepository?: BattleSquaddieRepository;
        camera?: BattleCamera;
        battleSquaddieSelectedHUD?: BattleSquaddieSelectedHUD;
        squaddieMovePath?: SearchPath;
        battlePhaseState?: BattlePhaseState;
        squaddieCurrentlyActing?: SquaddieInstructionInProgress;
        battleEventRecording?: Recording;
        teamStrategyByAffiliation?: { [key in SquaddieAffiliation]?: TeamStrategy[] };
        teamsByAffiliation?: { [affiliation in SquaddieAffiliation]?: BattleSquaddieTeam };
        missionCompletionStatus?: MissionCompletionStatus;
        missionStatistics?: MissionStatistics
    }) {

        const {
            objectives,
            cutsceneCollection,
            cutsceneTriggers,
            resourceHandler,
            missionMap,
            squaddieRepository,
            camera,
            battleSquaddieSelectedHUD,
            squaddieMovePath,
            battlePhaseState,
            squaddieCurrentlyActing,
            battleEventRecording,
            teamStrategyByAffiliation,
            teamsByAffiliation,
            missionStatistics,
            missionCompletionStatus,
        } = options;

        this.resourceHandler = options.resourceHandler;
        this.squaddieRepository = options.squaddieRepository;

        this.missionMap = options.missionMap;

        this.teamsByAffiliation = {...teamsByAffiliation};
        this.copyTeamStrategyByAffiliation(teamStrategyByAffiliation);
        this.battlePhaseState = options.battlePhaseState || {
            currentAffiliation: BattlePhase.UNKNOWN,
            turnCount: 0,
        };

        this.squaddieMovePath = options.squaddieMovePath || undefined;
        this._squaddieCurrentlyActing = options.squaddieCurrentlyActing || DefaultSquaddieInstructionInProgress();

        this.camera = options.camera || new BattleCamera();
        this.battleSquaddieSelectedHUD = options.battleSquaddieSelectedHUD || new BattleSquaddieSelectedHUD();

        this.missionStatistics = missionStatistics || MissionStatisticsHandler.new();
        this.battleEventRecording = options.battleEventRecording || {history: []};

        this.missionCompletionStatus = missionCompletionStatus;
        this._gameBoard = new BattleGameBoard({
            objectives,
            cutsceneCollection,
            cutsceneTriggers,
            missionCompletionStatus,
        })

        this.gameSaveFlags = {
            loadingInProgress: false,
            loadRequested: false,
            savingInProgress: false,
            errorDuringLoading: false,
            errorDuringSaving: false,
        }
    }

    private _squaddieCurrentlyActing: SquaddieInstructionInProgress;

    get squaddieCurrentlyActing(): SquaddieInstructionInProgress {
        return this._squaddieCurrentlyActing;
    }

    set squaddieCurrentlyActing(value: SquaddieInstructionInProgress) {
        this._squaddieCurrentlyActing = value;
    }

    get cutsceneTriggers(): CutsceneTrigger[] {
        return this.gameBoard.cutsceneTriggers;
    }

    set cutsceneTriggers(value: CutsceneTrigger[]) {
        this.gameBoard.cutsceneTriggers = value;
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

    get isValid(): boolean {
        return (
            this.missingComponents.length === 0
            || (
                this.missingComponents.length === 1
                && this.missingComponents.includes(BattleOrchestratorStateValidityMissingComponent.MISSION_OBJECTIVE)
            )
        );
    }

    get missingComponents(): BattleOrchestratorStateValidityMissingComponent[] {
        const expectedComponents = {
            [BattleOrchestratorStateValidityMissingComponent.MISSION_MAP]: this.missionMap !== undefined,
            [BattleOrchestratorStateValidityMissingComponent.RESOURCE_HANDLER]: this.resourceHandler !== undefined,
            [BattleOrchestratorStateValidityMissingComponent.SQUADDIE_REPOSITORY]: this.squaddieRepository !== undefined,
            [BattleOrchestratorStateValidityMissingComponent.TEAMS_BY_AFFILIATION]: (
                this.teamsByAffiliation !== undefined
                && Object.keys(this.teamsByAffiliation).length >= 1
                && this.teamStrategyByAffiliation !== undefined
            ),
            [BattleOrchestratorStateValidityMissingComponent.MISSION_OBJECTIVE]: (
                this.objectives !== undefined
                && this.objectives.length > 0
                && this.objectives[0].conditions.length > 0
            ),
        }

        return Object.keys(expectedComponents)
            .map((str) => str as BattleOrchestratorStateValidityMissingComponent)
            .filter((component) => expectedComponents[component] === false);
    }

    get isReadyToContinueMission(): boolean {
        return this.missingComponents.length === 0;
    }

    getCurrentTeam(): BattleSquaddieTeam {
        return this.teamsByAffiliation[this.battlePhaseState.currentAffiliation];
    }

    public clone(): BattleOrchestratorState {
        const newState = new BattleOrchestratorState({
            resourceHandler: this.resourceHandler,
            squaddieRepository: this.squaddieRepository,
            missionMap: new MissionMap({terrainTileMap: this.missionMap.terrainTileMap}),
            teamsByAffiliation: {...this.teamsByAffiliation},
            teamStrategyByAffiliation: {...this.teamStrategyByAffiliation},
            battlePhaseState: {...this.battlePhaseState},
            squaddieMovePath: this.squaddieMovePath,
            camera: this.camera,
            battleSquaddieSelectedHUD: this.battleSquaddieSelectedHUD,
            battleEventRecording: {...this.battleEventRecording},
            missionCompletionStatus: {...this.missionCompletionStatus},
            missionStatistics: {...this.missionStatistics},
            cutsceneCollection: this.cutsceneCollection,
            cutsceneTriggers: [...this.cutsceneTriggers],
            objectives: [...this.objectives],
            squaddieCurrentlyActing: {...this.squaddieCurrentlyActing},
        });

        newState.gameSaveFlags = {...this.gameSaveFlags};

        return newState;
    }

    public copyOtherOrchestratorState(other: BattleOrchestratorState): void {
        this.resourceHandler = other.resourceHandler;
        this.squaddieRepository = other.squaddieRepository;
        this.missionMap = new MissionMap({terrainTileMap: other.missionMap.terrainTileMap});
        this.teamsByAffiliation = {...other.teamsByAffiliation};
        this.teamStrategyByAffiliation = {...other.teamStrategyByAffiliation};
        this.battlePhaseState = {...other.battlePhaseState};
        this.squaddieMovePath = other.squaddieMovePath;
        this.camera = other.camera;
        this.battleSquaddieSelectedHUD = other.battleSquaddieSelectedHUD;
        this.battleEventRecording = {...other.battleEventRecording};
        this.missionStatistics = {...other.missionStatistics};
        this.missionCompletionStatus = {...other.missionCompletionStatus};

        this._gameBoard = new BattleGameBoard({
            objectives: [...other.objectives],
            cutsceneCollection: other.cutsceneCollection,
            cutsceneTriggers: [...other.cutsceneTriggers],
            missionCompletionStatus: {...other.gameBoard.missionCompletionStatus},
        })

        this.squaddieCurrentlyActing = {...other.squaddieCurrentlyActing};
        this.gameSaveFlags = {...other.gameSaveFlags};
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
            this.teamStrategyByAffiliation[affiliation] = [];
        });
    }
}

export enum BattleOrchestratorStateValidityMissingComponent {
    MISSION_MAP = "MISSION_MAP",
    RESOURCE_HANDLER = "RESOURCE_HANDLER",
    SQUADDIE_REPOSITORY = "SQUADDIE_REPOSITORY",
    TEAMS_BY_AFFILIATION = "TEAMS_BY_AFFILIATION",
    MISSION_OBJECTIVE = "MISSION_OBJECTIVE",
}

export const BattleOrchestratorStateHelper = {
    newOrchestratorState: ({
                               resourceHandler
                           }: {
        resourceHandler: ResourceHandler
    }): BattleOrchestratorState => {
        return new BattleOrchestratorState({
            resourceHandler,
            squaddieRepository: new BattleSquaddieRepository(),
            camera: new BattleCamera(0, 100),
        });
    }
}
