import { BattleOrchestratorState } from "../orchestrator/battleOrchestratorState"
import { BattleCamera } from "../battleCamera"
import {
    MissionStatistics,
    MissionStatisticsService,
} from "../missionStatistics/missionStatistics"
import { InBattleAttributes } from "../stats/inBattleAttributes"
import { SquaddieTurn } from "../../squaddie/turn"
import { MissionMapSquaddieCoordinate } from "../../missionMap/squaddieCoordinate"
import {
    SAVE_CONTENT_TYPE,
    SAVE_FILENAME,
    SaveFile,
} from "../../utils/fileHandling/saveFile"
import { TeamStrategy } from "../teamStrategy/teamStrategy"
import { BattleSquaddieTeam } from "../battleSquaddieTeam"
import { MissionCompletionStatus } from "../missionResult/missionCompletionStatus"
import { BattleEvent } from "../event/battleEvent"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { getResultOrThrowError } from "../../utils/resultOrError"
import {
    BattlePhase,
    TBattlePhase,
} from "../orchestratorComponents/battlePhaseTracker"
import { isValidValue } from "../../utils/objectValidityCheck"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import {
    BattleActionRecorder,
    BattleActionRecorderService,
} from "./battleAction/battleActionRecorder"
import { MissionMapService } from "../../missionMap/missionMap"
import {
    ChallengeModifierSetting,
    ChallengeModifierSettingService,
} from "../challengeModifier/challengeModifierSetting"

export type InBattleAttributesAndTurn = {
    inBattleAttributes: InBattleAttributes
    turn: SquaddieTurn
}

export interface BattleSaveState {
    campaignId: string
    saveVersion: string
    missionId: string
    battlePhaseState: {
        currentPhase: TBattlePhase
        turnCount: number
    }
    camera: {
        xCoordinate: number
        yCoordinate: number
    }
    battleActionRecorder: BattleActionRecorder
    missionStatistics: MissionStatistics
    inBattleAttributesBySquaddieBattleId: {
        [squaddieBattleId: string]: InBattleAttributesAndTurn
    }
    squaddieMapPlacements: MissionMapSquaddieCoordinate[]
    teams: BattleSquaddieTeam[]
    teamStrategiesById: { [key: string]: TeamStrategy[] }
    missionCompletionStatus: MissionCompletionStatus
    battleEvents: BattleEvent[]
    challengeModifierSetting: ChallengeModifierSetting
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
        applySaveStateToOrchestratorStateCamera(
            battleOrchestratorState,
            battleSaveState
        )
        applySaveStateToOrchestratorStateTurnAndPhase(
            battleOrchestratorState,
            battleSaveState
        )
        battleOrchestratorState.battleState.battleActionRecorder =
            BattleActionRecorderService.clone(
                battleSaveState.battleActionRecorder
            )
        applySaveStateToOrchestratorStateMissionStatistics(
            battleOrchestratorState,
            battleSaveState
        )
        applySaveStateToOrchestratorStateSquaddieMapPlacements(
            battleSaveState,
            battleOrchestratorState
        )
        applySaveStateToOrchestratorStateInBattleAttributes(
            battleSaveState,
            squaddieRepository
        )
        applySaveStateToOrchestratorStateTeamsAndTeamStrategies(
            battleOrchestratorState,
            battleSaveState
        )
        applySaveStateToOrchestratorStateBattleEvents(
            battleOrchestratorState,
            battleSaveState
        )
        applySaveStateToOrchestratorStateMissionCompletion(
            battleOrchestratorState,
            battleSaveState
        )

        battleOrchestratorState.battleState.challengeModifierSetting =
            ChallengeModifierSettingService.clone(
                battleSaveState.challengeModifierSetting
            )
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

        const cameraCoordinates =
            battleOrchestratorState.battleState.camera.getWorldLocation()

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
                xCoordinate: cameraCoordinates.x,
                yCoordinate: cameraCoordinates.y,
            },
            battleActionRecorder:
                battleOrchestratorState.battleState.battleActionRecorder,
            missionStatistics:
                battleOrchestratorState.battleState.missionStatistics,
            inBattleAttributesBySquaddieBattleId:
                inBattleAttributesBySquaddieBattleId,
            squaddieMapPlacements: MissionMapService.getAllSquaddieData(
                battleOrchestratorState.battleState.missionMap
            ),
            teams: battleOrchestratorState.battleState.teams,
            teamStrategiesById:
                battleOrchestratorState.battleState.teamStrategiesById,
            missionCompletionStatus:
                battleOrchestratorState.battleState.missionCompletionStatus,
            battleEvents: battleOrchestratorState.battleState.battleEvents,
            challengeModifierSetting:
                battleOrchestratorState.battleState.challengeModifierSetting,
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
        battleActionRecorder: BattleActionRecorderService.new(),
        missionStatistics: MissionStatisticsService.new({}),
        inBattleAttributesBySquaddieBattleId: {},
        squaddieMapPlacements: [],
        teams: [],
        teamStrategiesById: {},
        missionCompletionStatus: {},
        battleEvents: [],
        challengeModifierSetting: ChallengeModifierSettingService.new(),
    }
}

const applySaveStateToOrchestratorStateCamera = (
    battleOrchestratorState: BattleOrchestratorState,
    battleSaveState: BattleSaveState
) => {
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
}
const applySaveStateToOrchestratorStateTurnAndPhase = (
    battleOrchestratorState: BattleOrchestratorState,
    battleSaveState: BattleSaveState
) => {
    battleOrchestratorState.battleState.battlePhaseState = {
        currentAffiliation: battleSaveState.battlePhaseState.currentPhase,
        turnCount: battleSaveState.battlePhaseState.turnCount,
    }
}
const applySaveStateToOrchestratorStateMissionStatistics = (
    battleOrchestratorState: BattleOrchestratorState,
    battleSaveState: BattleSaveState
) => {
    battleOrchestratorState.battleState.missionStatistics = {
        ...battleSaveState.missionStatistics,
    }
}
const applySaveStateToOrchestratorStateSquaddieMapPlacements = (
    battleSaveState: BattleSaveState,
    battleOrchestratorState: BattleOrchestratorState
) => {
    battleSaveState.squaddieMapPlacements.forEach(
        (coordinateData: MissionMapSquaddieCoordinate) =>
            MissionMapService.updateBattleSquaddieCoordinate({
                missionMap: battleOrchestratorState.battleState.missionMap,
                battleSquaddieId: coordinateData.battleSquaddieId,
                coordinate: undefined,
            })
    )
    battleSaveState.squaddieMapPlacements.forEach(
        (coordinateData: MissionMapSquaddieCoordinate) => {
            MissionMapService.updateBattleSquaddieCoordinate({
                missionMap: battleOrchestratorState.battleState.missionMap,
                battleSquaddieId: coordinateData.battleSquaddieId,
                coordinate: coordinateData.currentMapCoordinate,
            })
            MissionMapService.setOriginMapCoordinateToCurrentMapCoordinate(
                battleOrchestratorState.battleState.missionMap,
                coordinateData.battleSquaddieId
            )
        }
    )
}
const applySaveStateToOrchestratorStateInBattleAttributes = (
    battleSaveState: BattleSaveState,
    squaddieRepository: ObjectRepository
) => {
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
}
const applySaveStateToOrchestratorStateTeamsAndTeamStrategies = (
    battleOrchestratorState: BattleOrchestratorState,
    battleSaveState: BattleSaveState
) => {
    battleOrchestratorState.battleState.teams = [...battleSaveState.teams]
    battleOrchestratorState.battleState.teamStrategiesById = {
        ...battleSaveState.teamStrategiesById,
    }
}
const applySaveStateToOrchestratorStateBattleEvents = (
    battleOrchestratorState: BattleOrchestratorState,
    battleSaveState: BattleSaveState
) => {
    battleOrchestratorState.battleState.battleEvents = [
        ...battleSaveState.battleEvents,
    ]
}
const applySaveStateToOrchestratorStateMissionCompletion = (
    battleOrchestratorState: BattleOrchestratorState,
    battleSaveState: BattleSaveState
) => {
    battleOrchestratorState.battleState.missionCompletionStatus = {
        ...battleSaveState.missionCompletionStatus,
    }
}
