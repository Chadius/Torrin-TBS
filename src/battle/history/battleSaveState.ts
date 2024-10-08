import { BattleOrchestratorState } from "../orchestrator/battleOrchestratorState"
import { BattleCamera } from "../battleCamera"
import { Recording } from "./recording"
import {
    MissionStatistics,
    MissionStatisticsService,
} from "../missionStatistics/missionStatistics"
import { InBattleAttributes } from "../stats/inBattleAttributes"
import { SquaddieTurn } from "../../squaddie/turn"
import { MissionMapSquaddieLocation } from "../../missionMap/squaddieLocation"
import {
    SAVE_CONTENT_TYPE,
    SAVE_FILENAME,
    SaveFile,
} from "../../utils/fileHandling/saveFile"
import { TeamStrategy } from "../teamStrategy/teamStrategy"
import { BattleSquaddieTeam } from "../battleSquaddieTeam"
import { MissionCompletionStatus } from "../missionResult/missionCompletionStatus"
import { CutsceneTrigger } from "../../cutscene/cutsceneTrigger"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { BattlePhase } from "../orchestratorComponents/battlePhaseTracker"
import { isValidValue } from "../../utils/validityCheck"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"

export type InBattleAttributesAndTurn = {
    inBattleAttributes: InBattleAttributes
    turn: SquaddieTurn
}

export interface BattleSaveState {
    campaignId: string
    saveVersion: string
    missionId: string
    battlePhaseState: {
        currentPhase: BattlePhase
        turnCount: number
    }
    camera: {
        xCoordinate: number
        yCoordinate: number
    }
    battleEventRecording: Recording
    missionStatistics: MissionStatistics
    inBattleAttributesBySquaddieBattleId: {
        [squaddieBattleId: string]: InBattleAttributesAndTurn
    }
    squaddieMapPlacements: MissionMapSquaddieLocation[]
    teams: BattleSquaddieTeam[]
    teamStrategiesById: { [key: string]: TeamStrategy[] }
    missionCompletionStatus: MissionCompletionStatus
    cutsceneTriggerCompletion: CutsceneTrigger[]
}

export const BattleSaveStateService = {
    applySaveStateToOrchestratorState: ({
        battleSaveState,
        battleOrchestratorState,
        squaddieRepository,
    }: {
        battleSaveState: BattleSaveState
        battleOrchestratorState: BattleOrchestratorState
        squaddieRepository: ObjectRepository
    }): void => {
        if (!isValidValue(battleSaveState)) {
            throw new Error(
                "applySaveStateToOrchestratorState: no save state found"
            )
        }

        if (!isValidValue(battleOrchestratorState)) {
            throw new Error(
                "applySaveStateToOrchestratorState: no battle orchestrator state found"
            )
        }

        battleOrchestratorState.battleState.camera = new BattleCamera(
            battleSaveState.camera.xCoordinate,
            battleSaveState.camera.yCoordinate
        )
        battleOrchestratorState.battleState.camera.setMapDimensionBoundaries(
            TerrainTileMapService.getDimensions(
                battleOrchestratorState.battleState.missionMap.terrainTileMap
            ).widthOfWidestRow,
            TerrainTileMapService.getDimensions(
                battleOrchestratorState.battleState.missionMap.terrainTileMap
            ).numberOfRows
        )

        battleOrchestratorState.battleState.battlePhaseState = {
            currentAffiliation: battleSaveState.battlePhaseState.currentPhase,
            turnCount: battleSaveState.battlePhaseState.turnCount,
        }
        battleOrchestratorState.battleState.recording = {
            ...battleSaveState.battleEventRecording,
        }
        battleOrchestratorState.battleState.missionStatistics = {
            ...battleSaveState.missionStatistics,
        }

        battleSaveState.squaddieMapPlacements.forEach(
            (locationData: MissionMapSquaddieLocation) => {
                battleOrchestratorState.battleState.missionMap.updateSquaddieLocation(
                    locationData.battleSquaddieId,
                    undefined
                )
            }
        )
        battleSaveState.squaddieMapPlacements.forEach(
            (locationData: MissionMapSquaddieLocation) => {
                battleOrchestratorState.battleState.missionMap.updateSquaddieLocation(
                    locationData.battleSquaddieId,
                    locationData.mapLocation
                )
            }
        )

        for (let squaddieBattleId in battleSaveState.inBattleAttributesBySquaddieBattleId) {
            const { battleSquaddie } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    squaddieRepository,
                    squaddieBattleId
                )
            )

            battleSquaddie.inBattleAttributes =
                battleSaveState.inBattleAttributesBySquaddieBattleId[
                    squaddieBattleId
                ].inBattleAttributes
            battleSquaddie.squaddieTurn =
                battleSaveState.inBattleAttributesBySquaddieBattleId[
                    squaddieBattleId
                ].turn
        }

        battleOrchestratorState.battleState.teams = [...battleSaveState.teams]
        battleOrchestratorState.battleState.teamStrategiesById = {
            ...battleSaveState.teamStrategiesById,
        }

        battleOrchestratorState.battleState.cutsceneTriggers = [
            ...battleSaveState.cutsceneTriggerCompletion,
        ]
        battleOrchestratorState.battleState.missionCompletionStatus = {
            ...battleSaveState.missionCompletionStatus,
        }
    },
    stringifyBattleSaveStateData: (saveData: BattleSaveState): string => {
        return stringifyBattleSaveStateData(saveData)
    },
    parseJsonIntoBattleSaveStateData: (dataString: string): BattleSaveState => {
        return parseJsonIntoBattleSaveStateData(dataString)
    },
    newUsingBattleOrchestratorState: ({
        missionId,
        campaignId,
        battleOrchestratorState,
        saveVersion,
        repository,
    }: {
        battleOrchestratorState: BattleOrchestratorState
        missionId: string
        campaignId: string
        saveVersion: string
        repository: ObjectRepository
    }): BattleSaveState => {
        const cameraCoordinates =
            battleOrchestratorState.battleState.camera.getCoordinates()

        const inBattleAttributesBySquaddieBattleId: {
            [squaddieBattleId: string]: InBattleAttributesAndTurn
        } = {}
        ObjectRepositoryService.getBattleSquaddieIterator(repository).forEach(
            (battleSquaddieInfo) => {
                inBattleAttributesBySquaddieBattleId[
                    battleSquaddieInfo.battleSquaddieId
                ] = {
                    inBattleAttributes:
                        battleSquaddieInfo.battleSquaddie.inBattleAttributes,
                    turn: battleSquaddieInfo.battleSquaddie.squaddieTurn,
                }
            }
        )

        return {
            campaignId,
            saveVersion: saveVersion,
            missionId: missionId,
            battlePhaseState: {
                currentPhase:
                    battleOrchestratorState.battleState.battlePhaseState
                        .currentAffiliation,
                turnCount:
                    battleOrchestratorState.battleState.battlePhaseState
                        .turnCount,
            },
            camera: {
                xCoordinate: cameraCoordinates[0],
                yCoordinate: cameraCoordinates[1],
            },
            battleEventRecording: battleOrchestratorState.battleState.recording,
            missionStatistics:
                battleOrchestratorState.battleState.missionStatistics,
            inBattleAttributesBySquaddieBattleId:
                inBattleAttributesBySquaddieBattleId,
            squaddieMapPlacements:
                battleOrchestratorState.battleState.missionMap.getAllSquaddieData(),
            teams: battleOrchestratorState.battleState.teams,
            teamStrategiesById:
                battleOrchestratorState.battleState.teamStrategiesById,
            missionCompletionStatus:
                battleOrchestratorState.battleState.missionCompletionStatus,
            cutsceneTriggerCompletion:
                battleOrchestratorState.battleState.cutsceneTriggers,
        }
    },
    SaveToFile: (data: BattleSaveState) => {
        const dataToSave: string = stringifyBattleSaveStateData(data)
        SaveFile.DownloadToBrowser({
            fileName: SAVE_FILENAME,
            content: dataToSave,
            contentType: SAVE_CONTENT_TYPE,
        })
    },
}

const stringifyBattleSaveStateData = (saveData: BattleSaveState): string => {
    return JSON.stringify(saveData)
}

const parseJsonIntoBattleSaveStateData = (
    dataString: string
): BattleSaveState => {
    return JSON.parse(dataString)
}

export const DefaultBattleSaveState = (): BattleSaveState => {
    return {
        campaignId: "",
        saveVersion: "version not set",
        missionId: "",
        battlePhaseState: {
            currentPhase: BattlePhase.UNKNOWN,
            turnCount: 0,
        },
        camera: {
            xCoordinate: 0,
            yCoordinate: 0,
        },
        battleEventRecording: { history: [] },
        missionStatistics: MissionStatisticsService.new({}),
        inBattleAttributesBySquaddieBattleId: {},
        squaddieMapPlacements: [],
        teams: [],
        teamStrategiesById: {},
        missionCompletionStatus: {},
        cutsceneTriggerCompletion: [],
    }
}
