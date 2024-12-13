import { BattleSquaddie } from "../battleSquaddie"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"
import { SquaddieService } from "../../squaddie/squaddieService"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { SearchParametersService } from "../../hexMap/pathfinder/searchParameters"
import { TargetingShapeGeneratorService } from "../targeting/targetingShapeGenerator"
import { SearchPath } from "../../hexMap/pathfinder/searchPath"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import {
    SearchResult,
    SearchResultsService,
} from "../../hexMap/pathfinder/searchResults/searchResult"
import { PathfinderService } from "../../hexMap/pathfinder/pathGeneration/pathfinder"
import { MapHighlightService } from "../animation/mapHighlight"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import {
    MapGraphicsLayerService,
    MapGraphicsLayerType,
} from "../../hexMap/mapGraphicsLayer"
import { HexGridService } from "../../hexMap/hexGridDirection"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { MissionMap, MissionMapService } from "../../missionMap/missionMap"
import { isValidValue } from "../../utils/validityCheck"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import {
    SquaddieAffiliation,
    SquaddieAffiliationService,
} from "../../squaddie/squaddieAffiliation"
import { ActionTemplateService } from "../../action/template/actionTemplate"

export const BattleSquaddieSelectorService = {
    createSearchPathAndHighlightMovementPath: ({
        gameEngineState,
        squaddieTemplate,
        battleSquaddie,
        clickedHexCoordinate,
    }: {
        gameEngineState: GameEngineState
        squaddieTemplate: SquaddieTemplate
        battleSquaddie: BattleSquaddie
        clickedHexCoordinate: HexCoordinate
    }) => {
        return createSearchPath(
            gameEngineState,
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
        actionPointsRemaining,
    }: {
        gameEngineState: GameEngineState
        battleSquaddie: BattleSquaddie
        squaddieTemplate: SquaddieTemplate
        stopLocation: HexCoordinate
        distanceRangeFromDestination: {
            minimum: number
            maximum: number
        }
        actionPointsRemaining?: number
    }): SearchPath => {
        const searchResults = getAllTilesSquaddieCanReach({
            gameEngineState,
            battleSquaddie,
            squaddieTemplate,
            stopLocation,
            actionPointsRemaining,
        })

        if (
            isAlreadyAtTheLocation({
                gameEngineState,
                stopLocation,
                battleSquaddieId: battleSquaddie.battleSquaddieId,
            })
        ) {
            return searchResults.shortestPathByLocation[stopLocation.q][
                stopLocation.r
            ]
        }

        let coordinateInfo = getReachableCoordinatesByDistanceFromStopLocation({
            distanceRangeFromDestination,
            maximumDistanceOfMap: TerrainTileMapService.getMaximumDistance(
                gameEngineState.battleOrchestratorState.battleState.missionMap
                    .terrainTileMap
            ),
            stopLocation,
            gameEngineState,
            searchResults,
        })

        if (
            coordinateInfo.distancesFromStopLocationWithCoordinates.length === 0
        ) {
            return undefined
        }

        coordinateInfo.distancesFromStopLocationWithCoordinates.sort()

        let coordinatesToConsider: HexCoordinate[] =
            coordinateInfo.coordinatesByDistanceFromStopLocation[
                coordinateInfo.distancesFromStopLocationWithCoordinates[
                    coordinateInfo.distancesFromStopLocationWithCoordinates
                        .length - 1
                ]
            ]

        coordinatesToConsider.sort((a, b) => {
            const searchPathA = searchResults.shortestPathByLocation[a.q][a.r]
            const searchPathB = searchResults.shortestPathByLocation[b.q][b.r]
            return sortByNumberOfMoveActions(searchPathA, searchPathB)
        })

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
    getBestActionAndLocationToActFrom: ({
        actorBattleSquaddieId,
        targetBattleSquaddieId,
        gameEngineState,
    }: {
        actorBattleSquaddieId: string
        targetBattleSquaddieId: string
        gameEngineState: GameEngineState
    }): {
        useThisActionTemplateId: string
        moveToThisLocation: HexCoordinate
    } => {
        const objectRepository = gameEngineState.repository
        const map =
            gameEngineState.battleOrchestratorState.battleState.missionMap

        const {
            battleSquaddie: actorBattleSquaddie,
            squaddieTemplate: actorSquaddieTemplate,
        } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                objectRepository,
                actorBattleSquaddieId
            )
        )

        const actorAndTargetAreAllies = areActorAndTargetAllies(
            objectRepository,
            targetBattleSquaddieId,
            actorSquaddieTemplate
        )

        const actionsToTargetWith = actorAndTargetAreAllies
            ? SquaddieService.getActionsThatTargetAlly({
                  squaddieTemplate: actorSquaddieTemplate,
                  objectRepository,
              })
            : SquaddieService.getActionsThatTargetFoe({
                  squaddieTemplate: actorSquaddieTemplate,
                  objectRepository,
              })

        const { mapCoordinate: targetMapLocation } =
            MissionMapService.getByBattleSquaddieId(map, targetBattleSquaddieId)

        const highestPriorityActionThatCanBeUsedOnTarget =
            actionsToTargetWith.reduce(
                (
                    usableActionInfo: {
                        actionTemplateId: string
                        destination: HexCoordinate
                    },
                    actionTemplateId
                ) => {
                    if (usableActionInfo) {
                        return usableActionInfo
                    }

                    const actionTemplate =
                        ObjectRepositoryService.getActionTemplateById(
                            objectRepository,
                            actionTemplateId
                        )
                    if (!actionTemplate) {
                        return usableActionInfo
                    }

                    const actionEffectTemplates =
                        ActionTemplateService.getActionEffectTemplates(
                            actionTemplate
                        )
                    if (actionEffectTemplates.length === 0) {
                        return usableActionInfo
                    }

                    const actionPointsRemaining =
                        SquaddieService.getNumberOfActionPoints({
                            squaddieTemplate: actorSquaddieTemplate,
                            battleSquaddie: actorBattleSquaddie,
                        }).actionPointsRemaining -
                        actionTemplate.resourceCost.actionPoints
                    if (actionPointsRemaining <= 0) {
                        return usableActionInfo
                    }

                    const closestRoute =
                        BattleSquaddieSelectorService.getClosestRouteForSquaddieToReachDestination(
                            {
                                gameEngineState,
                                battleSquaddie: actorBattleSquaddie,
                                squaddieTemplate: actorSquaddieTemplate,
                                stopLocation: targetMapLocation,
                                distanceRangeFromDestination: {
                                    minimum:
                                        actionTemplate.targetConstraints
                                            .minimumRange,
                                    maximum:
                                        actionTemplate.targetConstraints
                                            .maximumRange,
                                },
                                actionPointsRemaining: actionPointsRemaining,
                            }
                        )

                    return isValidValue(closestRoute)
                        ? {
                              actionTemplateId: actionTemplate.id,
                              destination: closestRoute.destination,
                          }
                        : usableActionInfo
                },
                undefined
            )

        if (highestPriorityActionThatCanBeUsedOnTarget) {
            return {
                useThisActionTemplateId:
                    highestPriorityActionThatCanBeUsedOnTarget.actionTemplateId,
                moveToThisLocation:
                    highestPriorityActionThatCanBeUsedOnTarget.destination,
            }
        }

        if (!actorAndTargetAreAllies) {
            return undefined
        }

        return getAsCloseAsPossibleOnlyUsingMovement(
            gameEngineState,
            actorBattleSquaddie,
            actorSquaddieTemplate,
            targetMapLocation
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

    const { squaddieIsNormallyControllableByPlayer } =
        SquaddieService.canPlayerControlSquaddieRightNow({
            squaddieTemplate,
            battleSquaddie,
        })

    const routeTilesByDistance =
        MapHighlightService.convertSearchPathToHighlightLocations({
            searchPath: closestRoute,
            battleSquaddieId: battleSquaddie.battleSquaddieId,
            repository: gameEngineState.repository,
            campaignResources: gameEngineState.campaign.resources,
            squaddieIsNormallyControllableByPlayer,
        })
    const actionRangeOnMap = MapGraphicsLayerService.new({
        id: battleSquaddie.battleSquaddieId,
        highlightedTileDescriptions: routeTilesByDistance,
        type: MapGraphicsLayerType.CLICKED_ON_CONTROLLABLE_SQUADDIE,
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
    actionPointsRemaining,
}: {
    gameEngineState: GameEngineState
    battleSquaddie: BattleSquaddie
    squaddieTemplate: SquaddieTemplate
    stopLocation?: HexCoordinate
    actionPointsRemaining?: number
}): SearchResult => {
    const mapCoordinate = MissionMapService.getByBattleSquaddieId(
        gameEngineState.battleOrchestratorState.battleState.missionMap,
        battleSquaddie.battleSquaddieId
    ).mapCoordinate

    if (actionPointsRemaining === undefined) {
        ;({ actionPointsRemaining } = SquaddieService.getNumberOfActionPoints({
            squaddieTemplate,
            battleSquaddie,
        }))
    }

    return PathfinderService.search({
        searchParameters: SearchParametersService.new({
            pathGenerators: {
                startCoordinates: [
                    {
                        q: mapCoordinate.q,
                        r: mapCoordinate.r,
                    },
                ],
            },
            pathSizeConstraints: {
                movementPerAction:
                    SquaddieService.getSquaddieMovementAttributes({
                        battleSquaddie,
                        squaddieTemplate,
                    }).net.movementPerAction,
                numberOfActions: actionPointsRemaining,
            },
            pathContinueConstraints: {
                squaddieAffiliation: {
                    searchingSquaddieAffiliation:
                        squaddieTemplate.squaddieId.affiliation,
                },
                canPassThroughWalls:
                    SquaddieService.getSquaddieMovementAttributes({
                        battleSquaddie,
                        squaddieTemplate,
                    }).net.passThroughWalls,
                canPassOverPits: SquaddieService.getSquaddieMovementAttributes({
                    battleSquaddie,
                    squaddieTemplate,
                }).net.crossOverPits,
                ignoreTerrainCost:
                    SquaddieService.getSquaddieMovementAttributes({
                        battleSquaddie,
                        squaddieTemplate,
                    }).net.ignoreTerrainCost,
            },
            pathStopConstraints: {},
            goal: {
                stopCoordinates: stopLocation ? [stopLocation] : [],
            },
        }),
        missionMap:
            gameEngineState.battleOrchestratorState.battleState.missionMap,
        objectRepository: gameEngineState.repository,
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
                            actionTemplate.resourceCost.actionPoints <=
                        actionPointsRemaining
                    )
                })
                .forEach((coordinate) => {
                    actionTemplate.actionEffectTemplates.forEach(
                        (actionSquaddieEffectTemplate) => {
                            let uniqueLocations: HexCoordinate[] = []

                            const actionRangeResults = PathfinderService.search(
                                {
                                    searchParameters:
                                        SearchParametersService.new({
                                            pathGenerators: {
                                                startCoordinates: [coordinate],
                                                shapeGenerator:
                                                    TargetingShapeGeneratorService.new(
                                                        actionTemplate
                                                            .targetConstraints
                                                            .targetingShape
                                                    ),
                                            },
                                            pathStopConstraints: {
                                                canStopOnSquaddies: true,
                                            },
                                            pathContinueConstraints: {
                                                canPassOverPits: true,
                                                canPassThroughWalls:
                                                    TraitStatusStorageService.getStatus(
                                                        actionSquaddieEffectTemplate.traits,
                                                        Trait.PASS_THROUGH_WALLS
                                                    ),
                                                ignoreTerrainCost: true,
                                                squaddieAffiliation: {
                                                    searchingSquaddieAffiliation:
                                                        SquaddieAffiliation.UNKNOWN,
                                                },
                                            },
                                            pathSizeConstraints: {
                                                minimumDistanceMoved:
                                                    actionTemplate
                                                        .targetConstraints
                                                        .minimumRange,
                                                maximumDistanceMoved:
                                                    actionTemplate
                                                        .targetConstraints
                                                        .maximumRange,
                                            },

                                            goal: {},
                                        }),
                                    missionMap,
                                    objectRepository: repository,
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
                        }
                    )
                })
        })
    return attackLocations
}

const getReachableCoordinatesByDistanceFromStopLocation = ({
    distanceRangeFromDestination,
    maximumDistanceOfMap,
    stopLocation,
    gameEngineState,
    searchResults,
}: {
    distanceRangeFromDestination: {
        minimum: number
        maximum: number
    }
    maximumDistanceOfMap: number
    stopLocation: HexCoordinate
    gameEngineState: GameEngineState
    searchResults: SearchResult
}): {
    distancesFromStopLocationWithCoordinates: number[]
    coordinatesByDistanceFromStopLocation: {
        [key: number]: HexCoordinate[]
    }
} => {
    let coordinateInfo: {
        distancesFromStopLocationWithCoordinates: number[]
        coordinatesByDistanceFromStopLocation: {
            [key: number]: HexCoordinate[]
        }
    } = {
        distancesFromStopLocationWithCoordinates: [],
        coordinatesByDistanceFromStopLocation: {},
    }

    let minimumDistanceFromStopLocation =
        distanceRangeFromDestination.minimum || 0
    let maximumDistanceFromStopLocation =
        distanceRangeFromDestination?.maximum < maximumDistanceOfMap
            ? distanceRangeFromDestination?.maximum
            : maximumDistanceOfMap

    for (
        let radiusFromStopLocation = minimumDistanceFromStopLocation;
        radiusFromStopLocation <= maximumDistanceFromStopLocation;
        radiusFromStopLocation++
    ) {
        let coordinatesAtThisDistanceFromStopLocation =
            HexGridService.GetCoordinatesForRingAroundCoordinate(
                stopLocation,
                radiusFromStopLocation
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
                        searchResults.shortestPathByLocation?.[coordinate.q]?.[
                            coordinate.r
                        ]
                )
                .filter(
                    (coordinate) =>
                        searchResults.shortestPathByLocation[coordinate.q][
                            coordinate.r
                        ].currentNumberOfMoveActions > 0
                )
        if (coordinatesAtThisDistanceFromStopLocation.length > 0) {
            coordinateInfo.coordinatesByDistanceFromStopLocation[
                radiusFromStopLocation
            ] = coordinatesAtThisDistanceFromStopLocation
            coordinateInfo.distancesFromStopLocationWithCoordinates.push(
                radiusFromStopLocation
            )
        }
    }

    return coordinateInfo
}

const sortByNumberOfMoveActions = (
    searchPathA: SearchPath,
    searchPathB: SearchPath
) => {
    switch (true) {
        case searchPathA.currentNumberOfMoveActions <
            searchPathB.currentNumberOfMoveActions:
            return -1
        case searchPathA.currentNumberOfMoveActions >
            searchPathB.currentNumberOfMoveActions:
            return 1
        default:
            return 0
    }
}

const isAlreadyAtTheLocation = ({
    stopLocation,
    gameEngineState,
    battleSquaddieId,
}: {
    stopLocation: HexCoordinate
    gameEngineState: GameEngineState
    battleSquaddieId: string
}): boolean => {
    const missionMapLocationDatum =
        MissionMapService.getBattleSquaddieAtLocation(
            gameEngineState.battleOrchestratorState.battleState.missionMap,
            stopLocation
        )

    return missionMapLocationDatum.battleSquaddieId === battleSquaddieId
}

const getAsCloseAsPossibleOnlyUsingMovement = (
    gameEngineState: GameEngineState,
    actorBattleSquaddie: BattleSquaddie,
    actorSquaddieTemplate: SquaddieTemplate,
    targetMapLocation: HexCoordinate
): {
    useThisActionTemplateId: string
    moveToThisLocation: HexCoordinate
} => {
    const closestRoute =
        BattleSquaddieSelectorService.getClosestRouteForSquaddieToReachDestination(
            {
                gameEngineState,
                battleSquaddie: actorBattleSquaddie,
                squaddieTemplate: actorSquaddieTemplate,
                stopLocation: targetMapLocation,
                distanceRangeFromDestination: {
                    minimum: 0,
                    maximum: 1,
                },
            }
        )

    if (!isValidValue(closestRoute)) {
        return undefined
    }

    return {
        useThisActionTemplateId: undefined,
        moveToThisLocation: closestRoute.destination,
    }
}

const areActorAndTargetAllies = (
    objectRepository: ObjectRepository,
    targetBattleSquaddieId: string,
    actorSquaddieTemplate: SquaddieTemplate
) => {
    const { squaddieTemplate: targetSquaddieTemplate } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            objectRepository,
            targetBattleSquaddieId
        )
    )
    return SquaddieAffiliationService.areSquaddieAffiliationsAllies({
        actingAffiliation: actorSquaddieTemplate.squaddieId.affiliation,
        targetAffiliation: targetSquaddieTemplate.squaddieId.affiliation,
    })
}
