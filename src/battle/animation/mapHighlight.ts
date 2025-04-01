import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { HighlightCoordinateDescription } from "../../hexMap/terrainTileMap"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { SquaddieService } from "../../squaddie/squaddieService"
import { HIGHLIGHT_PULSE_COLOR } from "../../hexMap/hexDrawingUtils"
import { MissionMap } from "../../missionMap/missionMap"
import { SearchResult } from "../../hexMap/pathfinder/searchResults/searchResult"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"
import { CampaignResources } from "../../campaign/campaignResources"
import { SquaddieTurn, SquaddieTurnService } from "../../squaddie/turn"
import { BattleSquaddieSelectorService } from "../orchestratorComponents/battleSquaddieSelectorUtils"
import { PulseColor } from "../../hexMap/pulseColor"
import { SearchResultAdapterService } from "../../hexMap/pathfinder/searchResults/searchResultAdapter"
import { MapSearchService } from "../../hexMap/pathfinder/pathGeneration/mapSearch"
import { SearchLimitService } from "../../hexMap/pathfinder/pathGeneration/searchLimit"
import { SearchPathAdapter } from "../../search/searchPathAdapter/searchPathAdapter"

export const MapHighlightService = {
    convertSearchPathToHighlightCoordinates: ({
        searchPath,
        repository,
        battleSquaddieId,
        campaignResources,
        squaddieIsNormallyControllableByPlayer,
    }: {
        searchPath: SearchPathAdapter
        repository: ObjectRepository
        battleSquaddieId: string
        campaignResources: CampaignResources
        squaddieIsNormallyControllableByPlayer: boolean
    }): HighlightCoordinateDescription[] => {
        const coordinatesByNumberOfMovementActions =
            SquaddieService.searchPathCoordinatesByNumberOfMovementActions({
                repository,
                battleSquaddieId,
                searchPath,
            })
        return Object.entries(coordinatesByNumberOfMovementActions).map(
            ([numberOfMoveActionsStr, coordinateTraveledList]) => {
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
                            squaddieIsNormallyControllableByPlayer
                                ? campaignResources
                                      .missionMapMovementIconResourceKeys
                                      .MOVE_1_ACTION_CONTROLLABLE_SQUADDIE
                                : campaignResources
                                      .missionMapMovementIconResourceKeys
                                      .MOVE_1_ACTION_UNCONTROLLABLE_SQUADDIE
                        break
                    case 2:
                        imageOverlayName =
                            squaddieIsNormallyControllableByPlayer
                                ? campaignResources
                                      .missionMapMovementIconResourceKeys
                                      .MOVE_2_ACTIONS_CONTROLLABLE_SQUADDIE
                                : campaignResources
                                      .missionMapMovementIconResourceKeys
                                      .MOVE_2_ACTIONS_UNCONTROLLABLE_SQUADDIE
                        break
                    default:
                        imageOverlayName =
                            squaddieIsNormallyControllableByPlayer
                                ? campaignResources
                                      .missionMapMovementIconResourceKeys
                                      .MOVE_3_ACTIONS_CONTROLLABLE_SQUADDIE
                                : campaignResources
                                      .missionMapMovementIconResourceKeys
                                      .MOVE_3_ACTIONS_UNCONTROLLABLE_SQUADDIE
                        break
                }
                return {
                    coordinates: coordinateTraveledList.map((loc) => {
                        return loc
                    }),
                    pulseColor: squaddieIsNormallyControllableByPlayer
                        ? HIGHLIGHT_PULSE_COLOR.BLUE
                        : HIGHLIGHT_PULSE_COLOR.PALE_BLUE,
                    overlayImageResourceName: imageOverlayName,
                }
            }
        )
    },
    highlightAllCoordinatesWithinSquaddieRange: ({
        startCoordinate,
        missionMap,
        repository,
        battleSquaddieId,
        campaignResources,
        squaddieTurnOverride,
    }: {
        startCoordinate: HexCoordinate
        missionMap: MissionMap
        repository: ObjectRepository
        battleSquaddieId: string
        campaignResources: CampaignResources
        squaddieTurnOverride?: SquaddieTurn
    }): HighlightCoordinateDescription[] => {
        const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                repository,
                battleSquaddieId
            )
        )

        let { unallocatedActionPoints } =
            SquaddieService.getNumberOfActionPoints({
                battleSquaddie,
                squaddieTemplate,
            })
        if (squaddieTurnOverride) {
            unallocatedActionPoints =
                SquaddieTurnService.getUnallocatedActionPoints(
                    squaddieTurnOverride
                )
        }

        const reachableCoordinateSearch: SearchResult =
            MapSearchService.calculateAllPossiblePathsFromStartingCoordinate({
                missionMap,
                startCoordinate,
                searchLimit: SearchLimitService.new({
                    baseSearchLimit: SearchLimitService.landBasedMovement(),
                    maximumMovementCost:
                        unallocatedActionPoints *
                        SquaddieService.getSquaddieMovementAttributes({
                            battleSquaddie,
                            squaddieTemplate,
                        }).net.movementPerAction,
                    ignoreTerrainCost:
                        SquaddieService.getSquaddieMovementAttributes({
                            battleSquaddie,
                            squaddieTemplate,
                        }).net.ignoreTerrainCost,
                    crossOverPits:
                        SquaddieService.getSquaddieMovementAttributes({
                            battleSquaddie,
                            squaddieTemplate,
                        }).net.crossOverPits,
                    passThroughWalls:
                        SquaddieService.getSquaddieMovementAttributes({
                            battleSquaddie,
                            squaddieTemplate,
                        }).net.passThroughWalls,
                    squaddieAffiliation:
                        squaddieTemplate.squaddieId.affiliation,
                }),
                objectRepository: repository,
            })

        const { squaddieIsNormallyControllableByPlayer } =
            SquaddieService.canPlayerControlSquaddieRightNow({
                squaddieTemplate,
                battleSquaddie,
            })

        const movementRange =
            highlightAllCoordinatesWithinSquaddieMovementRange({
                startCoordinate,
                reachableCoordinatesSearch: reachableCoordinateSearch,
                campaignResources,
                squaddieIsNormallyControllableByPlayer,
                movementPerAction:
                    SquaddieService.getSquaddieMovementAttributes({
                        battleSquaddie,
                        squaddieTemplate,
                    }).net.movementPerAction,
            })
        const attackRange = addAttackRangeOntoMovementRange({
            objectRepository: repository,
            battleSquaddieId,
            reachableCoordinateSearch: reachableCoordinateSearch,
            missionMap,
            campaignResources,
            squaddieIsNormallyControllableByPlayer,
            actionPointsRemaining: unallocatedActionPoints,
        })
        if (attackRange && attackRange.coordinates.length > 0) {
            return [...movementRange, attackRange]
        }
        return [...movementRange]
    },
}

const highlightAllCoordinatesWithinSquaddieMovementRange = ({
    startCoordinate,
    reachableCoordinatesSearch,
    campaignResources,
    squaddieIsNormallyControllableByPlayer,
    movementPerAction,
}: {
    startCoordinate: HexCoordinate
    reachableCoordinatesSearch: SearchResult
    campaignResources: CampaignResources
    squaddieIsNormallyControllableByPlayer: boolean
    movementPerAction: number
}) => {
    const pulseMovementColor: PulseColor =
        squaddieIsNormallyControllableByPlayer
            ? HIGHLIGHT_PULSE_COLOR.BLUE
            : HIGHLIGHT_PULSE_COLOR.PALE_BLUE

    const highlightedCoordinates: HighlightCoordinateDescription[] = [
        {
            coordinates: [{ ...startCoordinate }],
            pulseColor: pulseMovementColor,
            overlayImageResourceName: "",
        },
        {
            coordinates: [],
            pulseColor: pulseMovementColor,
            overlayImageResourceName: squaddieIsNormallyControllableByPlayer
                ? campaignResources.missionMapMovementIconResourceKeys
                      .MOVE_1_ACTION_CONTROLLABLE_SQUADDIE
                : campaignResources.missionMapMovementIconResourceKeys
                      .MOVE_1_ACTION_UNCONTROLLABLE_SQUADDIE,
        },
        {
            coordinates: [],
            pulseColor: pulseMovementColor,
            overlayImageResourceName: squaddieIsNormallyControllableByPlayer
                ? campaignResources.missionMapMovementIconResourceKeys
                      .MOVE_2_ACTIONS_CONTROLLABLE_SQUADDIE
                : campaignResources.missionMapMovementIconResourceKeys
                      .MOVE_2_ACTIONS_UNCONTROLLABLE_SQUADDIE,
        },
        {
            coordinates: [],
            pulseColor: pulseMovementColor,
            overlayImageResourceName: squaddieIsNormallyControllableByPlayer
                ? campaignResources.missionMapMovementIconResourceKeys
                      .MOVE_3_ACTIONS_CONTROLLABLE_SQUADDIE
                : campaignResources.missionMapMovementIconResourceKeys
                      .MOVE_3_ACTIONS_UNCONTROLLABLE_SQUADDIE,
        },
    ]
    Object.entries(
        SearchResultAdapterService.getCoordinatesByNumberOfMoveActions({
            searchResults: reachableCoordinatesSearch,
            movementPerAction,
        })
    ).forEach(([moveActionsStr, coordinates]) => {
        const moveActions = Number(moveActionsStr)
        let highlightedCoordinateIndex: number = Math.min(moveActions, 3)
        const coordinateBesidesStart = coordinates.filter(
            (l) => l.q !== startCoordinate.q || l.r !== startCoordinate.r
        )
        highlightedCoordinates[highlightedCoordinateIndex].coordinates.push(
            ...coordinateBesidesStart
        )
    })

    return highlightedCoordinates.filter(
        (description) => description.coordinates.length > 0
    )
}

const addAttackRangeOntoMovementRange = ({
    objectRepository,
    battleSquaddieId,
    reachableCoordinateSearch,
    missionMap,
    campaignResources,
    squaddieIsNormallyControllableByPlayer,
    actionPointsRemaining,
}: {
    objectRepository: ObjectRepository
    battleSquaddieId: string
    reachableCoordinateSearch: SearchResult
    missionMap: MissionMap
    campaignResources: CampaignResources
    squaddieIsNormallyControllableByPlayer: boolean
    actionPointsRemaining: number
}): HighlightCoordinateDescription => {
    const attackCoordinates =
        BattleSquaddieSelectorService.getAttackCoordinates({
            objectRepository,
            battleSquaddieId,
            reachableCoordinateSearch,
            missionMap,
            actionPointsRemaining,
        })

    const pulseActionColor: PulseColor = squaddieIsNormallyControllableByPlayer
        ? HIGHLIGHT_PULSE_COLOR.RED
        : HIGHLIGHT_PULSE_COLOR.PURPLE

    return {
        coordinates: attackCoordinates,
        pulseColor: pulseActionColor,
        overlayImageResourceName:
            campaignResources.missionMapAttackIconResourceKeys.ATTACK_1_ACTION,
    }
}
