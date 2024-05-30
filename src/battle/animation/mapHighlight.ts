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
import { PathfinderHelper } from "../../hexMap/pathfinder/pathGeneration/pathfinder"
import { SearchParametersHelper } from "../../hexMap/pathfinder/searchParams"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { GetTargetingShapeGenerator } from "../targeting/targetingShapeGenerator"
import { isValidValue } from "../../utils/validityCheck"
import { CampaignResources } from "../../campaign/campaignResources"
import { ActionEffectType } from "../../action/template/actionEffectTemplate"

export const MapHighlightHelper = {
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
                let imageOverlayName = ""
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
    }: {
        startLocation: { q: number; r: number }
        missionMap: MissionMap
        repository: ObjectRepository
        battleSquaddieId: string
        campaignResources: CampaignResources
    }): HighlightTileDescription[] => {
        const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                repository,
                battleSquaddieId
            )
        )

        const { actionPointsRemaining } =
            SquaddieService.getNumberOfActionPoints({
                battleSquaddie,
                squaddieTemplate,
            })

        const reachableLocationSearch: SearchResult = PathfinderHelper.search({
            searchParameters: SearchParametersHelper.new({
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
            repository,
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
    repository,
    battleSquaddieId,
    reachableLocationSearch,
    missionMap,
    campaignResources,
}: {
    repository: ObjectRepository
    battleSquaddieId: string
    reachableLocationSearch: SearchResult
    missionMap: MissionMap
    campaignResources: CampaignResources
}): HighlightTileDescription => {
    const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            repository,
            battleSquaddieId
        )
    )

    const { actionPointsRemaining } = SquaddieService.getNumberOfActionPoints({
        battleSquaddie,
        squaddieTemplate,
    })

    const allLocationsSquaddieCanMoveTo: HexCoordinate[] =
        SearchResultsService.getStoppableLocations(reachableLocationSearch)

    const attackLocations: HexCoordinate[] = []
    squaddieTemplate.actionTemplates.forEach((actionTemplate) => {
        allLocationsSquaddieCanMoveTo
            .filter((coordinate) => {
                const path: SearchPath =
                    reachableLocationSearch.shortestPathByLocation[
                        coordinate.q
                    ][coordinate.r]
                const numberOfMoveActionsToReachEndOfPath: number =
                    isValidValue(path) ? path.currentNumberOfMoveActions : 0
                return (
                    numberOfMoveActionsToReachEndOfPath +
                        actionTemplate.actionPoints <=
                    actionPointsRemaining
                )
            })
            .forEach((coordinate) => {
                actionTemplate.actionEffectTemplates
                    .filter(
                        (actionEffectTemplate) =>
                            actionEffectTemplate.type ===
                            ActionEffectType.SQUADDIE
                    )
                    .forEach((actionSquaddieEffectTemplate) => {
                        let uniqueLocations: HexCoordinate[] = []

                        switch (actionSquaddieEffectTemplate.type) {
                            case ActionEffectType.SQUADDIE:
                                const actionRangeResults =
                                    PathfinderHelper.search({
                                        searchParameters:
                                            SearchParametersHelper.new({
                                                startLocations: [coordinate],
                                                canStopOnSquaddies: true,
                                                canPassOverPits: true,
                                                canPassThroughWalls:
                                                    TraitStatusStorageService.getStatus(
                                                        actionSquaddieEffectTemplate.traits,
                                                        Trait.PASS_THROUGH_WALLS
                                                    ),
                                                minimumDistanceMoved:
                                                    actionSquaddieEffectTemplate.minimumRange,
                                                maximumDistanceMoved:
                                                    actionSquaddieEffectTemplate.maximumRange,
                                                squaddieAffiliation:
                                                    SquaddieAffiliation.UNKNOWN,
                                                ignoreTerrainCost: true,
                                                shapeGenerator:
                                                    getResultOrThrowError(
                                                        GetTargetingShapeGenerator(
                                                            actionSquaddieEffectTemplate.targetingShape
                                                        )
                                                    ),
                                            }),
                                        missionMap,
                                        repository,
                                    })

                                uniqueLocations =
                                    SearchResultsService.getStoppableLocations(
                                        actionRangeResults
                                    )
                                        .filter(
                                            (location) =>
                                                !attackLocations.some(
                                                    (attackLoc) =>
                                                        attackLoc.q ===
                                                            location.q &&
                                                        attackLoc.r ===
                                                            location.r
                                                )
                                        )
                                        .filter(
                                            (location) =>
                                                !allLocationsSquaddieCanMoveTo.some(
                                                    (moveLoc) =>
                                                        moveLoc.q ===
                                                            location.q &&
                                                        moveLoc.r === location.r
                                                )
                                        )
                                break
                        }
                        attackLocations.push(...uniqueLocations)
                    })
            })
    })

    return {
        tiles: attackLocations,
        pulseColor: HighlightPulseRedColor,
        overlayImageResourceName:
            campaignResources.missionMapAttackIconResourceKeys.ATTACK_1_ACTION,
    }
}
