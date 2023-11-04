import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {BattleCamera} from "../battleCamera";
import {BattlePhase} from "../orchestratorComponents/battlePhaseTracker";
import {Recording} from "./recording";
import {MissionMap} from "../../missionMap/missionMap";
import {MissionStatistics} from "../missionStatistics/missionStatistics";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {InBattleAttributes} from "../stats/inBattleAttributes";
import {SquaddieTurn} from "../../squaddie/turn";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {BattleSquaddie} from "../battleSquaddie";
import {MissionMapSquaddieLocation} from "../../missionMap/squaddieLocation";
import {SAVE_CONTENT_TYPE, SAVE_FILENAME, SaveFile} from "../../utils/fileHandling/saveFile";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {BattleSquaddieTeam} from "../battleSquaddieTeam";

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
}

export const BattleSaveStateHandler = {
    createBattleOrchestratorState: ({
                                        missionMap,
                                        squaddieRepository,
                                        saveData,
                                    }: {
        missionMap: MissionMap;
        squaddieRepository: BattleSquaddieRepository;
        saveData: BattleSaveState
    }): BattleOrchestratorState => {
        return createBattleOrchestratorState({
            missionMap,
            squaddieRepository,
            saveData,
        });
    },
    updateBattleOrchestratorState: (saveData: BattleSaveState, battleOrchestratorState: BattleOrchestratorState) => {
        const cameraCoordinates = battleOrchestratorState.camera.getCoordinates();
        saveData.camera = {
            xCoordinate: cameraCoordinates[0],
            yCoordinate: cameraCoordinates[1],
        }

        saveData.turn_count = battleOrchestratorState.battlePhaseState.turnCount;
        saveData.battle_event_recording = battleOrchestratorState.battleEventRecording;
        saveData.squaddie_map_placements = battleOrchestratorState.missionMap.getAllSquaddieData();
        saveData.mission_statistics = battleOrchestratorState.missionStatistics;

        saveData.in_battle_attributes_by_squaddie_battle_id = {};
        battleOrchestratorState.squaddieRepository.getBattleSquaddieIterator().forEach((battleSquaddieInfo) => {
            saveData.in_battle_attributes_by_squaddie_battle_id[battleSquaddieInfo.battleSquaddieId] = {
                in_battle_attributes: battleSquaddieInfo.battleSquaddie.inBattleAttributes,
                turn: battleSquaddieInfo.battleSquaddie.squaddieTurn,
            };
        });

        saveData.teams_by_affiliation = {...battleOrchestratorState.teamsByAffiliation};
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
            teams_by_affiliation: {},
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

const createBattleOrchestratorState = ({
                                           missionMap,
                                           squaddieRepository,
                                           saveData,
                                       }: {
    missionMap: MissionMap;
    squaddieRepository: BattleSquaddieRepository;
    saveData: BattleSaveState
}): BattleOrchestratorState => {
    saveData.squaddie_map_placements.forEach((datum) => {
        missionMap.addSquaddie(datum.squaddieTemplateId, datum.battleSquaddieId, datum.mapLocation);
    });

    Object.entries(saveData.in_battle_attributes_by_squaddie_battle_id).forEach(([battleSquaddieId, info]) => {
        const inBattleAttributes = info.in_battle_attributes;
        const turn = info.turn;

        const {
            battleSquaddie,
            squaddieTemplate
        } = getResultOrThrowError(squaddieRepository.getSquaddieByBattleId(battleSquaddieId));
        const newBattleSquaddie: BattleSquaddie = new BattleSquaddie({
            battleSquaddieId,
            mapIcon: battleSquaddie.mapIcon,
            squaddieTurn: turn,
            squaddieTemplate: squaddieTemplate,
            squaddieTemplateId: squaddieTemplate.templateId,
            inBattleAttributes,
        });

        squaddieRepository.updateBattleSquaddie(newBattleSquaddie);
    });

    return new BattleOrchestratorState({
        missionMap,
        camera: new BattleCamera(saveData.camera.xCoordinate, saveData.camera.yCoordinate),
        battlePhaseState: {
            currentAffiliation: BattlePhase.PLAYER,
            turnCount: saveData.turn_count,
        },
        battleEventRecording: saveData.battle_event_recording,
        missionStatistics: saveData.mission_statistics,
        squaddieRepository,
        teamsByAffiliation: saveData.teams_by_affiliation,
    });
};

export const DefaultBattleSaveState = (): BattleSaveState => {
    return {
        save_version: 0,
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
    }
}
