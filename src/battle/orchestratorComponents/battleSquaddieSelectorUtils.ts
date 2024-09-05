import { BattleSquaddie } from "../battleSquaddie"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"
import {
    GetNumberOfActionPoints,
    SquaddieService,
} from "../../squaddie/squaddieService"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { SearchParametersService } from "../../hexMap/pathfinder/searchParams"
import {
    GetTargetingShapeGenerator,
    TargetingShape,
} from "../targeting/targetingShapeGenerator"
import { SearchPath } from "../../hexMap/pathfinder/searchPath"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import {
    SearchResult,
    SearchResultsService,
} from "../../hexMap/pathfinder/searchResults/searchResult"
import { PathfinderService } from "../../hexMap/pathfinder/pathGeneration/pathfinder"
import { MapHighlightService } from "../animation/mapHighlight"
import { GameEngineState } from "../../gameEngine/gameEngine"
import {
    HighlightTileDescription,
    TerrainTileMapService,
} from "../../hexMap/terrainTileMap"
import {
    MapGraphicsLayerService,
    MapGraphicsLayerType,
} from "../../hexMap/mapGraphicsLayer"
import { HexGridService } from "../../hexMap/hexGridDirection"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { MissionMap } from "../../missionMap/missionMap"
import { CampaignResources } from "../../campaign/campaignResources"
import { isValidValue } from "../../utils/validityCheck"
import { ActionEffectType } from "../../action/template/actionEffectTemplate"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"

export const BattleSquaddieSelectorService = {
    createSearchPathAndHighlightMovementPath: ({
        state,
        squaddieTemplate,
        battleSquaddie,
        clickedHexCoordinate,
    }: {
        state: GameEngineState
        squaddieTemplate: SquaddieTemplate
        battleSquaddie: BattleSquaddie
        clickedHexCoordinate: HexCoordinate
    }) => {
        return createSearchPath(
            state,
            squaddieTemplate,
            battleSquaddie,
            clickedHexCoordinate
        )
    },
    getClosestRouteForSquaddieToReachDestination: ({
        gameEngineState,
        battleSquaddie,
        squaddieTemplate,
        stopLocation,
        distanceRangeFromDestination,
    }: {
        gameEngineState: GameEngineState
        battleSquaddie: BattleSquaddie
        squaddieTemplate: SquaddieTemplate
        stopLocation: HexCoordinate
        distanceRangeFromDestination: {
            minimum: number
            maximum: number
        }
    }): SearchPath => {
        const searchResults = getAllTilesSquaddieCanReach({
            gameEngineState,
            battleSquaddie,
            squaddieTemplate,
            stopLocation,
        })

        const maximumDistanceOfMap: number =
            TerrainTileMapService.getDimensions(
                gameEngineState.battleOrchestratorState.battleState.missionMap
                    .terrainTileMap
            ).widthOfWidestRow +
            TerrainTileMapService.getDimensions(
                gameEngineState.battleOrchestratorState.battleState.missionMap
                    .terrainTileMap
            ).numberOfRows

        let coordinatesToConsider: HexCoordinate[] = []
        const distanceIsBelowMaximum = (distance: number) =>
            (distanceRangeFromDestination.maximum === undefined ||
                distance <= distanceRangeFromDestination.maximum) &&
            distance <= maximumDistanceOfMap

        for (
            let distanceFromStopLocation =
                distanceRangeFromDestination.minimum || 0;
            coordinatesToConsider.length === 0 &&
            distanceIsBelowMaximum(distanceFromStopLocation);
            distanceFromStopLocation++
        ) {
            coordinatesToConsider =
                HexGridService.GetCoordinatesForRingAroundCoordinate(
                    stopLocation,
                    distanceFromStopLocation
                )
                    .filter((coordinate) =>
                        TerrainTileMapService.isLocationOnMap(
                            gameEngineState.battleOrchestratorState.battleState
                                .missionMap.terrainTileMap,
                            coordinate
                        )
                    )
                    .filter(
                        (coordinate) =>
                            searchResults.shortestPathByLocation?.[
                                coordinate.q
                            ]?.[coordinate.r]
                    )
                    .filter(
                        (coordinate) =>
                            searchResults.shortestPathByLocation[coordinate.q][
                                coordinate.r
                            ].currentNumberOfMoveActions > 0
                    )
        }

        coordinatesToConsider.sort((a, b) => {
            const searchPathA = searchResults.shortestPathByLocation[a.q][a.r]
            const searchPathB = searchResults.shortestPathByLocation[b.q][b.r]

            if (
                searchPathA.currentNumberOfMoveActions <
                searchPathB.currentNumberOfMoveActions
            ) {
                return -1
            }

            if (
                searchPathA.currentNumberOfMoveActions >
                searchPathB.currentNumberOfMoveActions
            ) {
                return 1
            }

            return 0
        })

        if (coordinatesToConsider.length === 0) {
            return undefined
        }

        const closestRouteThatCostsFewestActions = coordinatesToConsider[0]
        return searchResults.shortestPathByLocation[
            closestRouteThatCostsFewestActions.q
        ][closestRouteThatCostsFewestActions.r]
    },
    getAttackLocations: ({
        objectRepository,
        battleSquaddieId,
        reachableLocationSearch,
        missionMap,
    }: {
        objectRepository: ObjectRepository
        battleSquaddieId: string
        reachableLocationSearch: SearchResult
        missionMap: MissionMap
    }): HexCoordinate[] => {
        const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                objectRepository,
                battleSquaddieId
            )
        )

        const { actionPointsRemaining } =
            SquaddieService.getNumberOfActionPoints({
                battleSquaddie,
                squaddieTemplate,
            })

        const allLocationsSquaddieCanMoveTo: HexCoordinate[] =
            SearchResultsService.getStoppableLocations(reachableLocationSearch)
        return getSquaddieAttackLocations(
            squaddieTemplate,
            objectRepository,
            allLocationsSquaddieCanMoveTo,
            reachableLocationSearch,
            actionPointsRemaining,
            missionMap
        )
    },
}

const createSearchPath = (
    gameEngineState: GameEngineState,
    squaddieTemplate: SquaddieTemplate,
    battleSquaddie: BattleSquaddie,
    clickedHexCoordinate: HexCoordinate
) => {
    const searchResults = getAllTilesSquaddieCanReach({
        gameEngineState,
        battleSquaddie,
        squaddieTemplate,
        stopLocation: clickedHexCoordinate,
    })

    const closestRoute: SearchPath =
        SearchResultsService.getShortestPathToLocation(
            searchResults,
            clickedHexCoordinate.q,
            clickedHexCoordinate.r
        )

    const noDirectRouteToDestination = closestRoute === null
    if (noDirectRouteToDestination) {
        return
    }

    gameEngineState.battleOrchestratorState.battleState.squaddieMovePath =
        closestRoute

    const routeTilesByDistance =
        MapHighlightService.convertSearchPathToHighlightLocations({
            searchPath: closestRoute,
            battleSquaddieId: battleSquaddie.battleSquaddieId,
            repository: gameEngineState.repository,
            campaignResources: gameEngineState.campaign.resources,
        })
    const actionRangeOnMap = MapGraphicsLayerService.new({
        id: battleSquaddie.battleSquaddieId,
        highlightedTileDescriptions: routeTilesByDistance,
        type: MapGraphicsLayerType.CLICKED_ON_SQUADDIE,
    })
    TerrainTileMapService.removeAllGraphicsLayers(
        gameEngineState.battleOrchestratorState.battleState.missionMap
            .terrainTileMap
    )
    TerrainTileMapService.addGraphicsLayer(
        gameEngineState.battleOrchestratorState.battleState.missionMap
            .terrainTileMap,
        actionRangeOnMap
    )
}

const getAllTilesSquaddieCanReach = ({
    gameEngineState,
    battleSquaddie,
    squaddieTemplate,
    stopLocation,
}: {
    gameEngineState: GameEngineState
    battleSquaddie: BattleSquaddie
    squaddieTemplate: SquaddieTemplate
    stopLocation?: HexCoordinate
}): SearchResult => {
    const mapLocation =
        gameEngineState.battleOrchestratorState.battleState.missionMap.getSquaddieByBattleId(
            battleSquaddie.battleSquaddieId
        ).mapLocation
    const { actionPointsRemaining } = GetNumberOfActionPoints({
        squaddieTemplate,
        battleSquaddie,
    })
    return PathfinderService.search({
        searchParameters: SearchParametersService.new({
            startLocations: [
                {
                    q: mapLocation.q,
                    r: mapLocation.r,
                },
            ],
            movementPerAction:
                squaddieTemplate.attributes.movement.movementPerAction,
            canPassThroughWalls:
                squaddieTemplate.attributes.movement.passThroughWalls,
            canPassOverPits: squaddieTemplate.attributes.movement.crossOverPits,
            shapeGenerator: getResultOrThrowError(
                GetTargetingShapeGenerator(TargetingShape.SNAKE)
            ),
            maximumDistanceMoved: undefined,
            minimumDistanceMoved: undefined,
            canStopOnSquaddies: undefined,
            ignoreTerrainCost: undefined,
            stopLocations: stopLocation ? [stopLocation] : [],
            numberOfActions: actionPointsRemaining,
        }),
        missionMap:
            gameEngineState.battleOrchestratorState.battleState.missionMap,
        repository: gameEngineState.repository,
    })
}

const getSquaddieAttackLocations = (
    squaddieTemplate: SquaddieTemplate,
    repository: ObjectRepository,
    allLocationsSquaddieCanMoveTo: HexCoordinate[],
    reachableLocationSearch: SearchResult,
    actionPointsRemaining: number,
    missionMap: MissionMap
): HexCoordinate[] => {
    const attackLocations: HexCoordinate[] = []
    squaddieTemplate.actionTemplateIds
        .map((id) =>
            ObjectRepositoryService.getActionTemplateById(repository, id)
        )
        .forEach((actionTemplate) => {
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

                            if (
                                actionSquaddieEffectTemplate.type !==
                                ActionEffectType.SQUADDIE
                            ) {
                                return
                            }

                            const actionRangeResults = PathfinderService.search(
                                {
                                    searchParameters:
                                        SearchParametersService.new({
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
                                }
                            )

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
                                                    attackLoc.r === location.r
                                            )
                                    )
                                    .filter(
                                        (location) =>
                                            !allLocationsSquaddieCanMoveTo.some(
                                                (moveLoc) =>
                                                    moveLoc.q === location.q &&
                                                    moveLoc.r === location.r
                                            )
                                    )
                            attackLocations.push(...uniqueLocations)
                        })
                })
        })
    return attackLocations
}
