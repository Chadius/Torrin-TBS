import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {BattleCamera} from "../battleCamera";
import {BattlePhase} from "../orchestratorComponents/battlePhaseTracker";
import {Recording} from "./recording";
import {MissionStatistics} from "../missionStatistics/missionStatistics";
import {InBattleAttributes} from "../stats/inBattleAttributes";
import {SquaddieTurn} from "../../squaddie/turn";
import {MissionMapSquaddieLocation} from "../../missionMap/squaddieLocation";
import {SAVE_CONTENT_TYPE, SAVE_FILENAME, SAVE_VERSION, SaveFile} from "../../utils/fileHandling/saveFile";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {TeamStrategy} from "../teamStrategy/teamStrategy";
import {BattleSquaddieTeam} from "../battleSquaddieTeam";
import {MissionCompletionStatus} from "../missionResult/missionCompletionStatus";
import {CutsceneTrigger} from "../../cutscene/cutsceneTrigger";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {getResultOrThrowError} from "../../utils/ResultOrError";

export type InBattleAttributesAndTurn = {
    in_battle_attributes: InBattleAttributes,
    turn: SquaddieTurn,
};

export interface BattleSaveState {
    save_version: number;
    mission_id: string;
    turn_count: number;
    camera: {
        xCoordinate: number,
        yCoordinate: number,
    };
    battle_event_recording: Recording;
    mission_statistics: MissionStatistics;
    in_battle_attributes_by_squaddie_battle_id: {
        [squaddieBattleId: string]:
            InBattleAttributesAndTurn
    };
    squaddie_map_placements: MissionMapSquaddieLocation[];
    teams_by_affiliation: { [key in SquaddieAffiliation]?: BattleSquaddieTeam };
    team_strategy_by_affiliation: { [key in SquaddieAffiliation]?: TeamStrategy[] };
    mission_completion_status: MissionCompletionStatus;
    cutscene_trigger_completion: CutsceneTrigger[];
}

export const BattleSaveStateHandler = {
    applySaveStateToOrchestratorState: ({
                                            battleSaveState,
                                            battleOrchestratorState,
                                            squaddieRepository,
                                        }: {
        battleSaveState: BattleSaveState,
        battleOrchestratorState: BattleOrchestratorState,
        squaddieRepository: BattleSquaddieRepository,
    }): void => {
        battleOrchestratorState.camera = new BattleCamera(battleSaveState.camera.xCoordinate, battleSaveState.camera.yCoordinate);
        battleOrchestratorState.battlePhaseState = {
            currentAffiliation: BattlePhase.PLAYER,
            turnCount: battleSaveState.turn_count,
        };
        battleOrchestratorState.battleEventRecording = {...battleSaveState.battle_event_recording};
        battleOrchestratorState.missionStatistics = {...battleSaveState.mission_statistics};

        battleSaveState.squaddie_map_placements.forEach((locationData: MissionMapSquaddieLocation) => {
            battleOrchestratorState.missionMap.updateSquaddieLocation(locationData.battleSquaddieId, locationData.mapLocation);
        });

        for (let squaddieBattleId in battleSaveState.in_battle_attributes_by_squaddie_battle_id) {
            const {battleSquaddie} = getResultOrThrowError(squaddieRepository.getSquaddieByBattleId(squaddieBattleId));

            battleSquaddie.inBattleAttributes = battleSaveState.in_battle_attributes_by_squaddie_battle_id[squaddieBattleId].in_battle_attributes;
            battleSquaddie.squaddieTurn = battleSaveState.in_battle_attributes_by_squaddie_battle_id[squaddieBattleId].turn;
        }

        battleOrchestratorState.teamsByAffiliation = {...battleSaveState.teams_by_affiliation};
        battleOrchestratorState.teamStrategyByAffiliation = {...battleSaveState.team_strategy_by_affiliation};
        battleOrchestratorState.cutsceneTriggers = [...battleSaveState.cutscene_trigger_completion];
    },
    stringifyBattleSaveStateData: (saveData: BattleSaveState): string => {
        return stringifyBattleSaveStateData(saveData);
    },
    parseJsonIntoBattleSaveStateData: (dataString: string): BattleSaveState => {
        return parseJsonIntoBattleSaveStateData(dataString);
    },
    newUsingBattleOrchestratorState: ({missionId, battleOrchestratorState, saveVersion}: {
        battleOrchestratorState: BattleOrchestratorState;
        missionId: string,
        saveVersion: number,
    }): BattleSaveState => {
        const cameraCoordinates = battleOrchestratorState.camera.getCoordinates();

        const in_battle_attributes_by_squaddie_battle_id: {
            [squaddieBattleId: string]:
                InBattleAttributesAndTurn
        } = {};
        battleOrchestratorState.squaddieRepository.getBattleSquaddieIterator().forEach((battleSquaddieInfo) => {
            in_battle_attributes_by_squaddie_battle_id[battleSquaddieInfo.battleSquaddieId] = {
                in_battle_attributes: battleSquaddieInfo.battleSquaddie.inBattleAttributes,
                turn: battleSquaddieInfo.battleSquaddie.squaddieTurn,
            };
        });

        return {
            save_version: saveVersion,
            mission_id: missionId,
            turn_count: battleOrchestratorState.battlePhaseState.turnCount,
            camera: {
                xCoordinate: cameraCoordinates[0],
                yCoordinate: cameraCoordinates[1],
            },
            battle_event_recording: battleOrchestratorState.battleEventRecording,
            mission_statistics: battleOrchestratorState.missionStatistics,
            in_battle_attributes_by_squaddie_battle_id,
            squaddie_map_placements: battleOrchestratorState.missionMap.getAllSquaddieData(),
            teams_by_affiliation: battleOrchestratorState.teamsByAffiliation,
            team_strategy_by_affiliation: battleOrchestratorState.teamStrategyByAffiliation,
            mission_completion_status: battleOrchestratorState.missionCompletionStatus,
            cutscene_trigger_completion: battleOrchestratorState.cutsceneTriggers,
        }
    },
    SaveToFile: (data: BattleSaveState) => {
        const dataToSave: string = stringifyBattleSaveStateData(data);
        SaveFile.DownloadToBrowser({
            fileName: SAVE_FILENAME,
            content: dataToSave,
            contentType: SAVE_CONTENT_TYPE,
        });
    },
}

const stringifyBattleSaveStateData = (saveData: BattleSaveState): string => {
    return JSON.stringify(saveData);
};

const parseJsonIntoBattleSaveStateData = (dataString: string): BattleSaveState => {
    return JSON.parse(dataString);
};

export const DefaultBattleSaveState = (): BattleSaveState => {
    return {
        save_version: SAVE_VERSION,
        mission_id: "",
        turn_count: 0,
        camera: {
            xCoordinate: 0,
            yCoordinate: 0,
        },
        battle_event_recording: {history: []},
        mission_statistics: {
            timeElapsedInMilliseconds: undefined,
            damageDealtByPlayerTeam: undefined,
            damageTakenByPlayerTeam: undefined,
            healingReceivedByPlayerTeam: undefined,
        },
        in_battle_attributes_by_squaddie_battle_id: {},
        squaddie_map_placements: [],
        teams_by_affiliation: {},
        team_strategy_by_affiliation: {},
        mission_completion_status: {},
        cutscene_trigger_completion: [],
    }
}