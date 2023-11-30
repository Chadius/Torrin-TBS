import {
    BattleCompletionStatus,
    MissionObjectivesAndCutscenes,
    MissionObjectivesAndCutscenesHelper
} from "./missionObjectivesAndCutscenes";
import {MissionMap} from "../../missionMap/missionMap";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {BattleSquaddieTeam} from "../battleSquaddieTeam";
import {TeamStrategy} from "../teamStrategy/teamStrategy";
import {BattlePhaseState} from "../orchestratorComponents/battlePhaseController";
import {SearchPath} from "../../hexMap/pathfinder/searchPath";
import {BattleCamera} from "../battleCamera";
import {Recording} from "../history/recording";
import {MissionCompletionStatus} from "../missionResult/missionCompletionStatus";
import {MissionStatistics, MissionStatisticsHandler} from "../missionStatistics/missionStatistics";
import {SquaddieInstructionInProgress} from "../history/squaddieInstructionInProgress";
import {MissionCutsceneCollection} from "./missionCutsceneCollection";
import {CutsceneTrigger} from "../../cutscene/cutsceneTrigger";
import {MissionObjective} from "../missionResult/missionObjective";
import {NullMissionMap} from "../../utils/test/battleOrchestratorState";
import {BattlePhase} from "../orchestratorComponents/battlePhaseTracker";

export enum BattleStateValidityMissingComponent {
    MISSION_MAP = "MISSION_MAP",
    TEAMS_BY_AFFILIATION = "TEAMS_BY_AFFILIATION",
    MISSION_OBJECTIVE = "MISSION_OBJECTIVE",
}

export interface BattleState extends MissionObjectivesAndCutscenes {
    missionId: string;
    missionMap: MissionMap;
    teamsByAffiliation: { [affiliation in SquaddieAffiliation]?: BattleSquaddieTeam }
    teamStrategyByAffiliation: { [key in SquaddieAffiliation]?: TeamStrategy[] };
    battlePhaseState: BattlePhaseState;
    squaddieMovePath?: SearchPath;
    camera: BattleCamera;
    recording: Recording;
    gameSaveFlags: {
        errorDuringLoading: boolean;
        errorDuringSaving: boolean;
        loadingInProgress: boolean;
        savingInProgress: boolean;
        loadRequested: boolean;
    }
    missionCompletionStatus: MissionCompletionStatus;
    missionStatistics: MissionStatistics;
    squaddieCurrentlyActing: SquaddieInstructionInProgress;
}

export const BattleStateHelper = {
    newBattleState: (params: BattleStateConstructorParameters): BattleState => {
        return newBattleState(params);
    },
    isValid: (battleState: BattleState): boolean => {
        if (!battleState) {
            return false;
        }
        const missingComponents = getMissingComponents(battleState);
        return (
            missingComponents.length === 0
            || (
                missingComponents.length === 1
                && missingComponents.includes(BattleStateValidityMissingComponent.MISSION_OBJECTIVE)
            )
        );
    },
    missingComponents: (battleState: BattleState): BattleStateValidityMissingComponent[] => {
        return getMissingComponents(battleState);
    },
    isReadyToContinueMission: (battleState: BattleState): boolean => {
        const missingComponents = getMissingComponents(battleState);
        return missingComponents.length === 0;
    },
    getCurrentTeam: (battleState: BattleState): BattleSquaddieTeam => {
        return battleState.teamsByAffiliation[battleState.battlePhaseState.currentAffiliation];
    },
    clone: (battleState: BattleState): BattleState => {
        return {...battleState};
    },
    update: (battleState: BattleState, other: BattleState): void => {
        Object.assign(battleState, other);
    },
    defaultBattleState: (params: BattleStateConstructorParameters): BattleState => {
        const defaultParameters: BattleStateConstructorParameters = {
            ...{
                missionId: "default mission id",
                missionMap: NullMissionMap(),
                battlePhaseState: {
                    turnCount: 0,
                    currentAffiliation: BattlePhase.UNKNOWN,
                },
            },
            ...params,
        };

        return newBattleState(defaultParameters);
    }
}

interface BattleStateConstructorParameters {
    missionId: string;
    cutsceneCollection?: MissionCutsceneCollection;
    cutsceneTriggers?: CutsceneTrigger[];
    objectives?: MissionObjective[];
    missionMap?: MissionMap;
    camera?: BattleCamera;
    battlePhaseState?: BattlePhaseState;
    squaddieCurrentlyActing?: SquaddieInstructionInProgress;
    recording?: Recording;
    teamStrategyByAffiliation?: { [key in SquaddieAffiliation]?: TeamStrategy[] };
    teamsByAffiliation?: { [affiliation in SquaddieAffiliation]?: BattleSquaddieTeam };
    missionCompletionStatus?: MissionCompletionStatus;
    missionStatistics?: MissionStatistics;
    searchPath?: SearchPath;
    gameSaveFlags?: {
        errorDuringLoading: boolean;
        errorDuringSaving: boolean;
        loadingInProgress: boolean;
        savingInProgress: boolean;
        loadRequested: boolean;
    };
    battleCompletionStatus?: BattleCompletionStatus;
}

const newBattleState = ({
                            missionId,
                            objectives,
                            cutsceneCollection,
                            cutsceneTriggers,
                            missionMap,
                            camera,
                            battlePhaseState,
                            squaddieCurrentlyActing,
                            recording,
                            teamStrategyByAffiliation,
                            teamsByAffiliation,
                            missionStatistics,
                            missionCompletionStatus,
                            searchPath,
                            gameSaveFlags,
                            battleCompletionStatus,
                        }: BattleStateConstructorParameters): BattleState => {
    const missionObjectivesAndCutscenes = MissionObjectivesAndCutscenesHelper.new({
        objectives,
        cutsceneCollection,
        cutsceneTriggers,
        missionCompletionStatus,
        battleCompletionStatus,
    });

    return {
        ...missionObjectivesAndCutscenes,
        missionId: missionId,
        missionMap: missionMap,
        teamsByAffiliation: {...teamsByAffiliation},
        teamStrategyByAffiliation: copyTeamStrategyByAffiliation(teamStrategyByAffiliation),
        battlePhaseState: battlePhaseState,
        squaddieMovePath: searchPath || undefined,
        camera: camera || new BattleCamera(),
        recording: recording || {history: []},
        gameSaveFlags: {...gameSaveFlags},
        missionStatistics: missionStatistics || MissionStatisticsHandler.new(),
        squaddieCurrentlyActing: squaddieCurrentlyActing || {
            movingBattleSquaddieIds: [],
            currentlySelectedAction: undefined,
            squaddieActionsForThisRound: undefined,
        },
        battleCompletionStatus: battleCompletionStatus || BattleCompletionStatus.IN_PROGRESS,
    };
};

const copyTeamStrategyByAffiliation = (
    teamStrategyByAffiliation: {
        [key in SquaddieAffiliation]?: TeamStrategy[]
    }) => {
    const newTeamStrategyByAffiliation = {...teamStrategyByAffiliation};

    [
        SquaddieAffiliation.PLAYER,
        SquaddieAffiliation.ENEMY,
        SquaddieAffiliation.ALLY,
        SquaddieAffiliation.NONE,
    ].forEach((affiliation) => {
        if (newTeamStrategyByAffiliation[affiliation]) {
            return;
        }
        if (affiliation === SquaddieAffiliation.PLAYER) {
            return;
        }
        newTeamStrategyByAffiliation[affiliation] = [];
    });

    return newTeamStrategyByAffiliation;
};

const getMissingComponents = (battleState: BattleState): BattleStateValidityMissingComponent[] => {
    const expectedComponents = {
        [BattleStateValidityMissingComponent.MISSION_MAP]: battleState.missionMap !== undefined,
        [BattleStateValidityMissingComponent.TEAMS_BY_AFFILIATION]: (
            battleState.teamsByAffiliation !== undefined
            && Object.keys(battleState.teamsByAffiliation).length >= 1
            && battleState.teamStrategyByAffiliation !== undefined
        ),
        [BattleStateValidityMissingComponent.MISSION_OBJECTIVE]: (
            battleState.objectives !== undefined
            && battleState.objectives.length > 0
            && battleState.objectives[0].conditions.length > 0
        ),
    }

    return Object.keys(expectedComponents)
        .map((str) => str as BattleStateValidityMissingComponent)
        .filter((component) => expectedComponents[component] === false);
}
