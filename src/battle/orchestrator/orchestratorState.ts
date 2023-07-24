import {ResourceHandler} from "../../resource/resourceHandler";
import {MissionMap} from "../../missionMap/missionMap";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {Pathfinder} from "../../hexMap/pathfinder/pathfinder";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {BattlePhase, BattlePhaseTracker} from "../orchestratorComponents/battlePhaseTracker";
import {BattleCamera} from "../battleCamera";
import {Cutscene} from "../../cutscene/cutscene";
import {BattleSquaddieSelectedHUD} from "../battleSquaddieSelectedHUD";
import {BattleSquaddieUIInput, BattleSquaddieUISelectionState} from "../battleSquaddieUIInput";
import {SearchPath} from "../../hexMap/pathfinder/searchPath";
import {BattlePhaseState} from "../orchestratorComponents/battlePhaseController";
import {Recording} from "../history/recording";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {TeamStrategy} from "../teamStrategy/teamStrategy";
import {EndTurnTeamStrategy} from "../teamStrategy/endTurn";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {SquaddieInstructionInProgress} from "../history/squaddieInstructionInProgress";

export class OrchestratorState {
    resourceHandler: ResourceHandler;
    missionMap: MissionMap;
    hexMap: TerrainTileMap;
    pathfinder: Pathfinder;
    squaddieRepository: BattleSquaddieRepository;
    battlePhaseTracker: BattlePhaseTracker;
    camera: BattleCamera;
    currentCutscene: Cutscene;
    battleSquaddieSelectedHUD: BattleSquaddieSelectedHUD;
    battleSquaddieUIInput: BattleSquaddieUIInput;
    squaddieMovePath?: SearchPath;
    clickedHexCoordinate?: HexCoordinate;
    battlePhaseState: BattlePhaseState;
    squaddieCurrentlyActing: SquaddieInstructionInProgress;
    battleEventRecording: Recording;
    teamStrategyByAffiliation: { [key in SquaddieAffiliation]?: TeamStrategy[] }

    constructor(options: {
        bannerDisplayAnimationStartTime?: number;
        bannerAffiliationToShow?: BattlePhase;
        resourceHandler?: ResourceHandler;
        missionMap?: MissionMap;
        hexMap?: TerrainTileMap;
        pathfinder?: Pathfinder;
        squaddieRepo?: BattleSquaddieRepository;
        battlePhaseTracker?: BattlePhaseTracker;
        camera?: BattleCamera;
        currentCutscene?: Cutscene;
        battleSquaddieSelectedHUD?: BattleSquaddieSelectedHUD;
        battleSquaddieUIInput?: BattleSquaddieUIInput;
        squaddieMovePath?: SearchPath;
        clickedHexCoordinate?: HexCoordinate;
        battlePhaseState?: BattlePhaseState;
        squaddieCurrentlyActing?: SquaddieInstructionInProgress;
        battleEventRecording?: Recording;
        teamStrategyByAffiliation?: { [key in SquaddieAffiliation]?: TeamStrategy[] }
    }) {
        this.resourceHandler = options.resourceHandler;
        this.hexMap = options.hexMap;
        this.missionMap = options.missionMap;
        this.pathfinder = options.pathfinder;
        this.squaddieRepository = options.squaddieRepo;
        this.battlePhaseTracker = options.battlePhaseTracker || new BattlePhaseTracker();
        this.camera = options.camera || new BattleCamera();
        this.currentCutscene = options.currentCutscene;
        this.squaddieMovePath = options.squaddieMovePath || undefined;
        this.clickedHexCoordinate = options.clickedHexCoordinate || undefined;

        this.battleSquaddieUIInput = options.battleSquaddieUIInput || new BattleSquaddieUIInput({
            selectionState: BattleSquaddieUISelectionState.NO_SQUADDIE_SELECTED,
            missionMap: this.missionMap,
            squaddieRepository: this.squaddieRepository,
            squaddieInstructionInProgress: new SquaddieInstructionInProgress({}),
        });
        this.battleSquaddieSelectedHUD = options.battleSquaddieSelectedHUD || new BattleSquaddieSelectedHUD();
        this.battlePhaseState = options.battlePhaseState || {
            bannerPhaseToShow: BattlePhase.UNKNOWN,
        };
        this.squaddieCurrentlyActing = options.squaddieCurrentlyActing || undefined;
        this.battleEventRecording = options.battleEventRecording || new Recording({});

        this.copyTeamStrategyByAffiliation(options.teamStrategyByAffiliation);
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
