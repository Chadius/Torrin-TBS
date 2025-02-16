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
import {
    SquaddieSelectorPanel,
    SquaddieSelectorPanelService,
} from "../playerActionPanel/squaddieSelectorPanel/squaddieSelectorPanel"
import { BattleActionDecisionStep } from "../../actionDecision/battleActionDecisionStep"

export interface BattleHUDState {
    squaddieListing: {
        teamId: string
        battleSquaddieIds: string[]
        currentIndex: number
    }
    summaryHUDState: SummaryHUDState
    squaddieSelectorPanel: SquaddieSelectorPanel
}

export const BattleHUDStateService = {
    new: ({
        summaryHUDState,
    }: {
        summaryHUDState?: SummaryHUDState
    }): BattleHUDState =>
        newBattleHUDState({
            summaryHUDState,
        }),
    clone: (battleHUDState: BattleHUDState): BattleHUDState => {
        return newBattleHUDState({ ...battleHUDState })
    },
    resetSquaddieListingForTeam: ({
        battleHUDState,
        team,
        objectRepository,
        battleActionDecisionStep,
    }: {
        battleHUDState: BattleHUDState
        team: BattleSquaddieTeam
        objectRepository: ObjectRepository
        battleActionDecisionStep: BattleActionDecisionStep
    }) =>
        resetSquaddieListingForTeam({
            battleHUDState,
            team,
            objectRepository,
            battleActionDecisionStep,
        }),
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

            SquaddieSelectorPanelService.selectSquaddie(
                battleHUDState.squaddieSelectorPanel,
                currentBattleSquaddieId
            )
            return currentBattleSquaddieId
        }

        SquaddieSelectorPanelService.selectSquaddie(
            battleHUDState.squaddieSelectorPanel,
            undefined
        )
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
        squaddieSelectorPanel: undefined,
    })
}

const sanitize = (battleHUDState: BattleHUDState): BattleHUDState => {
    return battleHUDState
}

const resetSquaddieListingForTeam = ({
    battleHUDState,
    team,
    objectRepository,
    battleActionDecisionStep,
}: {
    battleHUDState: BattleHUDState
    team: BattleSquaddieTeam
    objectRepository: ObjectRepository
    battleActionDecisionStep: BattleActionDecisionStep
}) => {
    if (!team) return

    battleHUDState.squaddieListing = {
        teamId: team.id,
        battleSquaddieIds: [...team.battleSquaddieIds],
        currentIndex: 0,
    }
    battleHUDState.squaddieSelectorPanel = SquaddieSelectorPanelService.new({
        battleSquaddieIds: team.battleSquaddieIds,
        objectRepository,
        battleActionDecisionStep,
    })
}
