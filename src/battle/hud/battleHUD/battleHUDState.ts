import { SummaryHUDState } from "../summary/summaryHUD"
import { BattleSquaddieTeam } from "../../battleSquaddieTeam"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../objectRepository"
import { getResultOrThrowError } from "../../../utils/resultOrError"
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

        const selectableSquaddies =
            battleHUDState.squaddieListing.battleSquaddieIds
                .map((battleSquaddieId, squaddieListingIndex) => {
                    const { battleSquaddie, squaddieTemplate } =
                        getResultOrThrowError(
                            ObjectRepositoryService.getSquaddieByBattleId(
                                objectRepository,
                                battleSquaddieId
                            )
                        )

                    if (
                        !SquaddieService.canPlayerControlSquaddieRightNow({
                            battleSquaddie,
                            squaddieTemplate,
                        }).squaddieCanCurrentlyAct
                    )
                        return undefined

                    if (
                        !TerrainTileMapService.isCoordinateOnMap(
                            missionMap.terrainTileMap,
                            MissionMapService.getByBattleSquaddieId(
                                missionMap,
                                battleSquaddieId
                            ).currentMapCoordinate
                        )
                    )
                        return undefined

                    return {
                        battleSquaddieId,
                        squaddieListingIndex,
                    }
                })
                .filter((x) => x)

        if (selectableSquaddies.length === 0) {
            battleHUDState.squaddieListing.currentIndex = undefined
            SquaddieSelectorPanelService.selectSquaddie(
                battleHUDState.squaddieSelectorPanel,
                undefined
            )
            return undefined
        }

        if (selectableSquaddies.length === 1) {
            battleHUDState.squaddieListing.currentIndex =
                selectableSquaddies[0].squaddieListingIndex
            SquaddieSelectorPanelService.selectSquaddie(
                battleHUDState.squaddieSelectorPanel,
                selectableSquaddies[0].battleSquaddieId
            )
            return selectableSquaddies[0].battleSquaddieId
        }

        const alreadySelectedIndex = selectableSquaddies.findIndex(
            ({ squaddieListingIndex }) =>
                squaddieListingIndex ===
                battleHUDState.squaddieListing.currentIndex
        )
        let nextBattleSquaddieId =
            alreadySelectedIndex === -1 ||
            alreadySelectedIndex >= selectableSquaddies.length - 1
                ? selectableSquaddies[0]
                : selectableSquaddies[alreadySelectedIndex + 1]
        battleHUDState.squaddieListing.currentIndex =
            nextBattleSquaddieId.squaddieListingIndex
        SquaddieSelectorPanelService.selectSquaddie(
            battleHUDState.squaddieSelectorPanel,
            nextBattleSquaddieId.battleSquaddieId
        )
        return nextBattleSquaddieId.battleSquaddieId
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
        currentIndex: undefined,
    }
    battleHUDState.squaddieSelectorPanel = SquaddieSelectorPanelService.new({
        battleSquaddieIds: team.battleSquaddieIds,
        objectRepository,
        battleActionDecisionStep,
    })
}
