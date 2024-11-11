import { SearchPath } from "../../hexMap/pathfinder/searchPath"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { HighlightTileDescription } from "../../hexMap/terrainTileMap"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { SquaddieService } from "../../squaddie/squaddieService"
import { HIGHLIGHT_PULSE_COLOR } from "../../hexMap/hexDrawingUtils"
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
import { PulseBlendColor } from "../../hexMap/colorUtils"

export const MapHighlightService = {
    convertSearchPathToHighlightLocations: ({
        searchPath,
        repository,
        battleSquaddieId,
        campaignResources,
        squaddieIsNormallyControllableByPlayer,
    }: {
        searchPath: SearchPath
        repository: ObjectRepository
        battleSquaddieId: string
        campaignResources: CampaignResources
        squaddieIsNormallyControllableByPlayer: boolean
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
                    tiles: locations.map((loc) => {
                        return {
                            q: loc.hexCoordinate.q,
                            r: loc.hexCoordinate.r,
                        }
                    }),
                    pulseColor: squaddieIsNormallyControllableByPlayer
                        ? HIGHLIGHT_PULSE_COLOR.BLUE
                        : HIGHLIGHT_PULSE_COLOR.PALE_BLUE,
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
                    SquaddieService.getSquaddieMovementAttributes({
                        battleSquaddie,
                        squaddieTemplate,
                    }).movementPerAction,
                canPassOverPits: SquaddieService.getSquaddieMovementAttributes({
                    battleSquaddie,
                    squaddieTemplate,
                }).crossOverPits,
                canPassThroughWalls:
                    SquaddieService.getSquaddieMovementAttributes({
                        battleSquaddie,
                        squaddieTemplate,
                    }).passThroughWalls,
                squaddieAffiliation: squaddieTemplate.squaddieId.affiliation,
                canStopOnSquaddies: false,
            }),
            missionMap,
            objectRepository: repository,
        })
        const { squaddieIsNormallyControllableByPlayer } =
            SquaddieService.canPlayerControlSquaddieRightNow({
                squaddieTemplate,
                battleSquaddie,
            })

        const movementRange = highlightAllLocationsWithinSquaddieMovementRange({
            startLocation,
            reachableLocationSearch,
            campaignResources,
            squaddieIsNormallyControllableByPlayer,
        })
        const attackRange = addAttackRangeOntoMovementRange({
            objectRepository: repository,
            battleSquaddieId,
            reachableLocationSearch,
            missionMap,
            campaignResources,
            squaddieIsNormallyControllableByPlayer,
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
    squaddieIsNormallyControllableByPlayer,
}: {
    startLocation: HexCoordinate
    reachableLocationSearch: SearchResult
    campaignResources: CampaignResources
    squaddieIsNormallyControllableByPlayer: boolean
}) => {
    const pulseMovementColor: PulseBlendColor =
        squaddieIsNormallyControllableByPlayer
            ? HIGHLIGHT_PULSE_COLOR.BLUE
            : HIGHLIGHT_PULSE_COLOR.PALE_BLUE

    const highlightedLocations: HighlightTileDescription[] = [
        {
            tiles: [{ ...startLocation }],
            pulseColor: pulseMovementColor,
            overlayImageResourceName: "",
        },
        {
            tiles: [],
            pulseColor: pulseMovementColor,
            overlayImageResourceName: squaddieIsNormallyControllableByPlayer
                ? campaignResources.missionMapMovementIconResourceKeys
                      .MOVE_1_ACTION_CONTROLLABLE_SQUADDIE
                : campaignResources.missionMapMovementIconResourceKeys
                      .MOVE_1_ACTION_UNCONTROLLABLE_SQUADDIE,
        },
        {
            tiles: [],
            pulseColor: pulseMovementColor,
            overlayImageResourceName: squaddieIsNormallyControllableByPlayer
                ? campaignResources.missionMapMovementIconResourceKeys
                      .MOVE_2_ACTIONS_CONTROLLABLE_SQUADDIE
                : campaignResources.missionMapMovementIconResourceKeys
                      .MOVE_2_ACTIONS_UNCONTROLLABLE_SQUADDIE,
        },
        {
            tiles: [],
            pulseColor: pulseMovementColor,
            overlayImageResourceName: squaddieIsNormallyControllableByPlayer
                ? campaignResources.missionMapMovementIconResourceKeys
                      .MOVE_3_ACTIONS_CONTROLLABLE_SQUADDIE
                : campaignResources.missionMapMovementIconResourceKeys
                      .MOVE_3_ACTIONS_UNCONTROLLABLE_SQUADDIE,
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
    squaddieIsNormallyControllableByPlayer,
}: {
    objectRepository: ObjectRepository
    battleSquaddieId: string
    reachableLocationSearch: SearchResult
    missionMap: MissionMap
    campaignResources: CampaignResources
    squaddieIsNormallyControllableByPlayer: boolean
}): HighlightTileDescription => {
    const attackLocations = BattleSquaddieSelectorService.getAttackLocations({
        objectRepository,
        battleSquaddieId,
        reachableLocationSearch,
        missionMap,
    })

    const pulseActionColor: PulseBlendColor =
        squaddieIsNormallyControllableByPlayer
            ? HIGHLIGHT_PULSE_COLOR.RED
            : HIGHLIGHT_PULSE_COLOR.PURPLE

    return {
        tiles: attackLocations,
        pulseColor: pulseActionColor,
        overlayImageResourceName:
            campaignResources.missionMapAttackIconResourceKeys.ATTACK_1_ACTION,
    }
}
