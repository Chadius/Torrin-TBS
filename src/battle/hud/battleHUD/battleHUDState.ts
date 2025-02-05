import { SummaryHUDState } from "../summary/summaryHUD"
import { BattleSquaddieTeam } from "../../battleSquaddieTeam"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../objectRepository"
import { getResultOrThrowError } from "../../../utils/ResultOrError"
import { SquaddieService } from "../../../squaddie/squaddieService"
import { MissionMap, MissionMapService } from "../../../missionMap/missionMap"
import { TerrainTileMapService } from "../../../hexMap/terrainTileMap"

export interface BattleHUDState {
    squaddieListing: {
        teamId: string
        battleSquaddieIds: string[]
        currentIndex: number
    }
    summaryHUDState: SummaryHUDState
}

export const BattleHUDStateService = {
    new: ({
        summaryHUDState,
    }: {
        summaryHUDState?: SummaryHUDState
    }): BattleHUDState => {
        return newBattleHUDState({
            summaryHUDState,
        })
    },
    clone: (battleHUDState: BattleHUDState): BattleHUDState => {
        return newBattleHUDState({ ...battleHUDState })
    },
    resetSquaddieListingForTeam: ({
        battleHUDState,
        team,
    }: {
        battleHUDState: BattleHUDState
        team: BattleSquaddieTeam
    }) => {
        battleHUDState.squaddieListing = {
            teamId: team.id,
            battleSquaddieIds: [...team.battleSquaddieIds],
            currentIndex: 0,
        }
    },
    getNextSquaddieId: ({
        battleHUDState,
        objectRepository,
        missionMap,
    }: {
        battleHUDState: BattleHUDState
        objectRepository: ObjectRepository
        missionMap: MissionMap
    }): string => {
        if (battleHUDState?.squaddieListing?.battleSquaddieIds === undefined) {
            return undefined
        }
        for (
            let i = 0;
            i < battleHUDState.squaddieListing.battleSquaddieIds.length * 2;
            i++
        ) {
            let currentBattleSquaddieId =
                battleHUDState.squaddieListing.battleSquaddieIds[
                    battleHUDState.squaddieListing.currentIndex
                ]
            battleHUDState.squaddieListing.currentIndex =
                (battleHUDState.squaddieListing.currentIndex + 1) %
                battleHUDState.squaddieListing.battleSquaddieIds.length

            const { battleSquaddie, squaddieTemplate } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    objectRepository,
                    currentBattleSquaddieId
                )
            )

            if (
                !SquaddieService.canPlayerControlSquaddieRightNow({
                    battleSquaddie,
                    squaddieTemplate,
                }).squaddieCanCurrentlyAct
            )
                continue

            if (
                !TerrainTileMapService.isCoordinateOnMap(
                    missionMap.terrainTileMap,
                    MissionMapService.getByBattleSquaddieId(
                        missionMap,
                        currentBattleSquaddieId
                    ).mapCoordinate
                )
            )
                continue

            return currentBattleSquaddieId
        }

        return undefined
    },
}

const newBattleHUDState = ({
    summaryHUDState,
}: {
    summaryHUDState?: SummaryHUDState
}): BattleHUDState => {
    return sanitize({
        summaryHUDState,
        squaddieListing: {
            teamId: undefined,
            battleSquaddieIds: [],
            currentIndex: 0,
        },
    })
}

const sanitize = (battleHUDState: BattleHUDState): BattleHUDState => {
    return battleHUDState
}
