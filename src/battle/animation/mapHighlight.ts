import { SearchPath } from "../../hexMap/pathfinder/searchPath"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { HighlightTileDescription } from "../../hexMap/terrainTileMap"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { SquaddieService } from "../../squaddie/squaddieService"
import {
    HighlightPulseBlueColor,
    HighlightPulseRedColor,
} from "../../hexMap/hexDrawingUtils"
import { MissionMap } from "../../missionMap/missionMap"
import {
    SearchResult,
    SearchResultsService,
} from "../../hexMap/pathfinder/searchResults/searchResult"
import { PathfinderService } from "../../hexMap/pathfinder/pathGeneration/pathfinder"
import { SearchParametersService } from "../../hexMap/pathfinder/searchParams"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"
import { CampaignResources } from "../../campaign/campaignResources"
import { SquaddieTurn } from "../../squaddie/turn"
import { BattleSquaddieSelectorService } from "../orchestratorComponents/battleSquaddieSelectorUtils"

export const MapHighlightService = {
    convertSearchPathToHighlightLocations: ({
        searchPath,
        repository,
        battleSquaddieId,
        campaignResources,
    }: {
        searchPath: SearchPath
        repository: ObjectRepository
        battleSquaddieId: string
        campaignResources: CampaignResources
    }): HighlightTileDescription[] => {
        const locationsByNumberOfMovementActions =
            SquaddieService.searchPathLocationsByNumberOfMovementActions({
                repository,
                battleSquaddieId,
                searchPath,
            })
        return Object.entries(locationsByNumberOfMovementActions).map(
            ([numberOfMoveActionsStr, locations]) => {
                const numberOfMoveActions: number = Number(
                    numberOfMoveActionsStr
                )
                let imageOverlayName: string
                switch (numberOfMoveActions) {
                    case 0:
                        imageOverlayName = ""
                        break
                    case 1:
                        imageOverlayName =
                            campaignResources.missionMapMovementIconResourceKeys
                                .MOVE_1_ACTION
                        break
                    case 2:
                        imageOverlayName =
                            campaignResources.missionMapMovementIconResourceKeys
                                .MOVE_2_ACTIONS
                        break
                    default:
                        imageOverlayName =
                            campaignResources.missionMapMovementIconResourceKeys
                                .MOVE_3_ACTIONS
                        break
                }
                return {
                    tiles: locations.map((loc) => {
                        return {
                            q: loc.hexCoordinate.q,
                            r: loc.hexCoordinate.r,
                        }
                    }),
                    pulseColor: HighlightPulseBlueColor,
                    overlayImageResourceName: imageOverlayName,
                }
            }
        )
    },
    highlightAllLocationsWithinSquaddieRange: ({
        startLocation,
        missionMap,
        repository,
        battleSquaddieId,
        campaignResources,
        squaddieTurnOverride,
    }: {
        startLocation: { q: number; r: number }
        missionMap: MissionMap
        repository: ObjectRepository
        battleSquaddieId: string
        campaignResources: CampaignResources
        squaddieTurnOverride?: SquaddieTurn
    }): HighlightTileDescription[] => {
        const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                repository,
                battleSquaddieId
            )
        )

        let { actionPointsRemaining } = SquaddieService.getNumberOfActionPoints(
            {
                battleSquaddie,
                squaddieTemplate,
            }
        )
        if (squaddieTurnOverride) {
            actionPointsRemaining = squaddieTurnOverride.remainingActionPoints
        }

        const reachableLocationSearch: SearchResult = PathfinderService.search({
            searchParameters: SearchParametersService.new({
                startLocations: [startLocation],
                numberOfActions: actionPointsRemaining,
                movementPerAction:
                    squaddieTemplate.attributes.movement.movementPerAction,
                canPassOverPits:
                    squaddieTemplate.attributes.movement.crossOverPits,
                canPassThroughWalls:
                    squaddieTemplate.attributes.movement.passThroughWalls,
                squaddieAffiliation: squaddieTemplate.squaddieId.affiliation,
                canStopOnSquaddies: false,
            }),
            missionMap,
            repository,
        })

        const movementRange = highlightAllLocationsWithinSquaddieMovementRange({
            startLocation,
            reachableLocationSearch,
            campaignResources,
        })
        const attackRange = addAttackRangeOntoMovementRange({
            objectRepository: repository,
            battleSquaddieId,
            reachableLocationSearch,
            missionMap,
            campaignResources,
        })
        if (attackRange && attackRange.tiles.length > 0) {
            return [...movementRange, attackRange]
        }
        return [...movementRange]
    },
}

const highlightAllLocationsWithinSquaddieMovementRange = ({
    startLocation,
    reachableLocationSearch,
    campaignResources,
}: {
    startLocation: HexCoordinate
    reachableLocationSearch: SearchResult
    campaignResources: CampaignResources
}) => {
    const highlightedLocations: HighlightTileDescription[] = [
        {
            tiles: [{ ...startLocation }],
            pulseColor: HighlightPulseBlueColor,
            overlayImageResourceName: "",
        },
        {
            tiles: [],
            pulseColor: HighlightPulseBlueColor,
            overlayImageResourceName:
                campaignResources.missionMapMovementIconResourceKeys
                    .MOVE_1_ACTION,
        },
        {
            tiles: [],
            pulseColor: HighlightPulseBlueColor,
            overlayImageResourceName:
                campaignResources.missionMapMovementIconResourceKeys
                    .MOVE_2_ACTIONS,
        },
        {
            tiles: [],
            pulseColor: HighlightPulseBlueColor,
            overlayImageResourceName:
                campaignResources.missionMapMovementIconResourceKeys
                    .MOVE_3_ACTIONS,
        },
    ]
    Object.entries(
        SearchResultsService.getLocationsByNumberOfMoveActions(
            reachableLocationSearch
        )
    ).forEach(([moveActionsStr, locations]) => {
        const moveActions = Number(moveActionsStr)
        let highlightedLocationIndex: number = Math.min(moveActions, 3)
        const locationsBesidesStart = locations.filter(
            (l) => l.q !== startLocation.q || l.r !== startLocation.r
        )
        highlightedLocations[highlightedLocationIndex].tiles.push(
            ...locationsBesidesStart
        )
    })

    return highlightedLocations.filter(
        (description) => description.tiles.length > 0
    )
}

const addAttackRangeOntoMovementRange = ({
    objectRepository,
    battleSquaddieId,
    reachableLocationSearch,
    missionMap,
    campaignResources,
}: {
    objectRepository: ObjectRepository
    battleSquaddieId: string
    reachableLocationSearch: SearchResult
    missionMap: MissionMap
    campaignResources: CampaignResources
}): HighlightTileDescription => {
    const attackLocations = BattleSquaddieSelectorService.getAttackLocations({
        objectRepository,
        battleSquaddieId,
        reachableLocationSearch,
        missionMap,
    })

    return {
        tiles: attackLocations,
        pulseColor: HighlightPulseRedColor,
        overlayImageResourceName:
            campaignResources.missionMapAttackIconResourceKeys.ATTACK_1_ACTION,
    }
}
