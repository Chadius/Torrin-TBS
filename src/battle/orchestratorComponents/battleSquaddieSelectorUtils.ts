import { BattleSquaddie } from "../battleSquaddie"
import {
    HexCoordinate,
    HexCoordinateService,
} from "../../hexMap/hexCoordinate/hexCoordinate"
import { SquaddieService } from "../../squaddie/squaddieService"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import { SearchResult } from "../../hexMap/pathfinder/searchResults/searchResult"
import { MapHighlightService } from "../animation/mapHighlight"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import {
    MapGraphicsLayerService,
    MapGraphicsLayerType,
} from "../../hexMap/mapLayer/mapGraphicsLayer"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { MissionMap, MissionMapService } from "../../missionMap/missionMap"
import { isValidValue } from "../../utils/validityCheck"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import { SquaddieAffiliationService } from "../../squaddie/squaddieAffiliation"
import { ActionTemplateService } from "../../action/template/actionTemplate"
import { SearchResultAdapterService } from "../../hexMap/pathfinder/searchResults/searchResultAdapter"
import {
    SearchPathAdapter,
    SearchPathAdapterService,
} from "../../search/searchPathAdapter/searchPathAdapter"
import { MapSearchService } from "../../hexMap/pathfinder/pathGeneration/mapSearch"
import { SearchLimitService } from "../../hexMap/pathfinder/pathGeneration/searchLimit"

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
        stopCoordinate,
        distanceRangeFromDestination,
        actionPointsRemaining,
    }: {
        gameEngineState: GameEngineState
        battleSquaddie: BattleSquaddie
        squaddieTemplate: SquaddieTemplate
        stopCoordinate: HexCoordinate
        distanceRangeFromDestination: {
            minimum: number
            maximum: number
        }
        actionPointsRemaining?: number
    }): SearchPathAdapter => {
        const searchResults = getAllTilesSquaddieCanReach({
            gameEngineState,
            battleSquaddie,
            squaddieTemplate,
            stopCoordinate,
            actionPointsRemaining,
        })

        if (
            isAlreadyAtTheLocation({
                gameEngineState,
                stopCoordinate,
                battleSquaddieId: battleSquaddie.battleSquaddieId,
            })
        ) {
            return SearchResultAdapterService.getShortestPathToCoordinate({
                searchResults,
                mapCoordinate: stopCoordinate,
            })
        }

        let coordinateInfo =
            getReachableCoordinatesByDistanceFromStopCoordinate({
                distanceRangeFromDestination,
                maximumDistanceOfMap: TerrainTileMapService.getMaximumDistance(
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap.terrainTileMap
                ),
                stopCoordinate,
                gameEngineState,
                searchResults,
                battleSquaddie,
                squaddieTemplate,
            })

        if (
            coordinateInfo.distancesFromStopCoordinateWithCoordinates.length ===
            0
        ) {
            return undefined
        }

        coordinateInfo.distancesFromStopCoordinateWithCoordinates.sort(
            (a, b) => {
                switch (true) {
                    case a < b:
                        return -1
                    case a > b:
                        return 1
                    default:
                        return 0
                }
            }
        )

        let coordinatesToConsider: HexCoordinate[] =
            coordinateInfo.coordinatesByDistanceFromStopCoordinate[
                coordinateInfo.distancesFromStopCoordinateWithCoordinates[
                    coordinateInfo.distancesFromStopCoordinateWithCoordinates
                        .length - 1
                ]
            ]

        coordinatesToConsider.sort((a, b) => {
            const searchPathA =
                SearchResultAdapterService.getShortestPathToCoordinate({
                    searchResults,
                    mapCoordinate: a,
                })
            const numberOfMoveActionsA =
                SearchPathAdapterService.getNumberOfMoveActions({
                    path: searchPathA,
                    movementPerAction:
                        SquaddieService.getSquaddieMovementAttributes({
                            squaddieTemplate,
                            battleSquaddie,
                        }).net.movementPerAction,
                })

            const searchPathB =
                SearchResultAdapterService.getShortestPathToCoordinate({
                    searchResults,
                    mapCoordinate: b,
                })
            const numberOfMoveActionsB =
                SearchPathAdapterService.getNumberOfMoveActions({
                    path: searchPathB,
                    movementPerAction:
                        SquaddieService.getSquaddieMovementAttributes({
                            squaddieTemplate,
                            battleSquaddie,
                        }).net.movementPerAction,
                })

            switch (true) {
                case numberOfMoveActionsA < numberOfMoveActionsB:
                    return -1
                case numberOfMoveActionsA > numberOfMoveActionsB:
                    return 1
                default:
                    return 0
            }
        })

        const closestRouteThatCostsFewestActions = coordinatesToConsider[0]
        return SearchResultAdapterService.getShortestPathToCoordinate({
            searchResults,
            mapCoordinate: closestRouteThatCostsFewestActions,
        })
    },
    getAttackCoordinates: ({
        objectRepository,
        battleSquaddieId,
        reachableCoordinateSearch,
        missionMap,
        actionPointsRemaining,
    }: {
        objectRepository: ObjectRepository
        battleSquaddieId: string
        reachableCoordinateSearch: SearchResult
        missionMap: MissionMap
        actionPointsRemaining: number
    }): HexCoordinate[] => {
        const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                objectRepository,
                battleSquaddieId
            )
        )

        const allCoordinatesSquaddieCanMoveTo: HexCoordinate[] =
            SearchResultAdapterService.getCoordinatesWithPaths(
                reachableCoordinateSearch
            )
        return getSquaddieAttackCoordinates({
            battleSquaddie,
            squaddieTemplate: squaddieTemplate,
            repository: objectRepository,
            allCoordinatesSquaddieCanMoveTo: allCoordinatesSquaddieCanMoveTo,
            reachableCoordinateSearch: reachableCoordinateSearch,
            actionPointsRemaining: actionPointsRemaining,
            missionMap: missionMap,
        })
    },
    getBestActionAndCoordinateToActFrom: ({
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

        const { mapCoordinate: targetMapCoordinate } =
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

                    let unallocatedActionPoints =
                        SquaddieService.getNumberOfActionPoints({
                            squaddieTemplate: actorSquaddieTemplate,
                            battleSquaddie: actorBattleSquaddie,
                        }).unallocatedActionPoints -
                        actionTemplate.resourceCost.actionPoints
                    if (unallocatedActionPoints <= 0) {
                        return usableActionInfo
                    }

                    const closestRoute =
                        BattleSquaddieSelectorService.getClosestRouteForSquaddieToReachDestination(
                            {
                                gameEngineState,
                                battleSquaddie: actorBattleSquaddie,
                                squaddieTemplate: actorSquaddieTemplate,
                                stopCoordinate: targetMapCoordinate,
                                distanceRangeFromDestination: {
                                    minimum:
                                        actionTemplate.targetConstraints
                                            .minimumRange,
                                    maximum:
                                        actionTemplate.targetConstraints
                                            .maximumRange,
                                },
                                actionPointsRemaining: unallocatedActionPoints,
                            }
                        )

                    return isValidValue(closestRoute)
                        ? {
                              actionTemplateId: actionTemplate.id,
                              destination:
                                  SearchPathAdapterService.getHead(
                                      closestRoute
                                  ),
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
            targetMapCoordinate
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
        stopCoordinate: clickedHexCoordinate,
    })

    const closestRoute: SearchPathAdapter =
        SearchResultAdapterService.getShortestPathToCoordinate({
            searchResults: searchResults,
            mapCoordinate: clickedHexCoordinate,
        })

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
        MapHighlightService.convertSearchPathToHighlightCoordinates({
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
    stopCoordinate,
    actionPointsRemaining,
}: {
    gameEngineState: GameEngineState
    battleSquaddie: BattleSquaddie
    squaddieTemplate: SquaddieTemplate
    stopCoordinate?: HexCoordinate
    actionPointsRemaining?: number
}): SearchResult => {
    const mapCoordinate = MissionMapService.getByBattleSquaddieId(
        gameEngineState.battleOrchestratorState.battleState.missionMap,
        battleSquaddie.battleSquaddieId
    ).mapCoordinate

    if (actionPointsRemaining === undefined) {
        ;({ unallocatedActionPoints: actionPointsRemaining } =
            SquaddieService.getNumberOfActionPoints({
                squaddieTemplate,
                battleSquaddie,
            }))
    }

    return MapSearchService.calculatePathsToDestinations({
        missionMap:
            gameEngineState.battleOrchestratorState.battleState.missionMap,
        objectRepository: gameEngineState.repository,
        destinationCoordinates: stopCoordinate ? [stopCoordinate] : [],
        startCoordinate: mapCoordinate,
        searchLimit: SearchLimitService.new({
            baseSearchLimit: SearchLimitService.landBasedMovement(),
            canStopOnSquaddies: true,
            maximumMovementCost:
                SquaddieService.getSquaddieMovementAttributes({
                    battleSquaddie,
                    squaddieTemplate,
                }).net.movementPerAction * actionPointsRemaining,
            squaddieAffiliation: squaddieTemplate.squaddieId.affiliation,
            ignoreTerrainCost: SquaddieService.getSquaddieMovementAttributes({
                battleSquaddie,
                squaddieTemplate,
            }).net.ignoreTerrainCost,
            crossOverPits: SquaddieService.getSquaddieMovementAttributes({
                battleSquaddie,
                squaddieTemplate,
            }).net.crossOverPits,
            passThroughWalls: SquaddieService.getSquaddieMovementAttributes({
                battleSquaddie,
                squaddieTemplate,
            }).net.passThroughWalls,
        }),
    })
}

const getSquaddieAttackCoordinates = ({
    battleSquaddie,
    squaddieTemplate,
    repository,
    allCoordinatesSquaddieCanMoveTo,
    reachableCoordinateSearch,
    actionPointsRemaining,
    missionMap,
}: {
    battleSquaddie: BattleSquaddie
    squaddieTemplate: SquaddieTemplate
    repository: ObjectRepository
    allCoordinatesSquaddieCanMoveTo: HexCoordinate[]
    reachableCoordinateSearch: SearchResult
    actionPointsRemaining: number
    missionMap: MissionMap
}): HexCoordinate[] => {
    const attackCoordinates: HexCoordinate[] = []
    const getCoordinatesToAddToAttackCoordinates = (
        actionRangeResults: SearchResult
    ) => {
        return SearchResultAdapterService.getCoordinatesWithPaths(
            actionRangeResults
        )
            .filter(
                (coordinate) =>
                    !HexCoordinateService.includes(
                        attackCoordinates,
                        coordinate
                    )
            )
            .filter(
                (coordinate) =>
                    !HexCoordinateService.includes(
                        allCoordinatesSquaddieCanMoveTo,
                        coordinate
                    )
            )
    }
    squaddieTemplate.actionTemplateIds
        .map((id) =>
            ObjectRepositoryService.getActionTemplateById(repository, id)
        )
        .forEach((actionTemplate) => {
            allCoordinatesSquaddieCanMoveTo
                .filter((coordinate) => {
                    const path: SearchPathAdapter =
                        SearchResultAdapterService.getShortestPathToCoordinate({
                            searchResults: reachableCoordinateSearch,
                            mapCoordinate: coordinate,
                        })

                    const numberOfMoveActionsToReachEndOfPath: number =
                        isValidValue(path)
                            ? SearchPathAdapterService.getNumberOfMoveActions({
                                  path,
                                  movementPerAction:
                                      SquaddieService.getSquaddieMovementAttributes(
                                          {
                                              squaddieTemplate,
                                              battleSquaddie,
                                          }
                                      ).net.movementPerAction,
                              })
                            : 0

                    return (
                        numberOfMoveActionsToReachEndOfPath +
                            actionTemplate.resourceCost.actionPoints <=
                        actionPointsRemaining
                    )
                })
                .forEach((coordinate) => {
                    actionTemplate.actionEffectTemplates.forEach(
                        (actionSquaddieEffectTemplate) => {
                            let uniqueCoordinates: HexCoordinate[]
                            const actionRangeResults =
                                MapSearchService.calculateAllPossiblePathsFromStartingCoordinate(
                                    {
                                        startCoordinate: coordinate,
                                        missionMap,
                                        objectRepository: repository,
                                        searchLimit: SearchLimitService.new({
                                            baseSearchLimit:
                                                SearchLimitService.targeting(),
                                            passThroughWalls:
                                                TraitStatusStorageService.getStatus(
                                                    actionSquaddieEffectTemplate.traits,
                                                    Trait.PASS_THROUGH_WALLS
                                                ),
                                            crossOverPits:
                                                TraitStatusStorageService.getStatus(
                                                    actionSquaddieEffectTemplate.traits,
                                                    Trait.CROSS_OVER_PITS
                                                ),
                                            minimumDistance:
                                                actionTemplate.targetConstraints
                                                    .minimumRange,
                                            maximumDistance:
                                                actionTemplate.targetConstraints
                                                    .maximumRange,
                                        }),
                                    }
                                )

                            uniqueCoordinates =
                                getCoordinatesToAddToAttackCoordinates(
                                    actionRangeResults
                                )
                            attackCoordinates.push(...uniqueCoordinates)
                        }
                    )
                })
        })
    return attackCoordinates
}

const getReachableCoordinatesByDistanceFromStopCoordinate = ({
    distanceRangeFromDestination,
    maximumDistanceOfMap,
    stopCoordinate,
    gameEngineState,
    searchResults,
    battleSquaddie,
    squaddieTemplate,
}: {
    distanceRangeFromDestination: {
        minimum: number
        maximum: number
    }
    maximumDistanceOfMap: number
    stopCoordinate: HexCoordinate
    gameEngineState: GameEngineState
    searchResults: SearchResult
    battleSquaddie: BattleSquaddie
    squaddieTemplate: SquaddieTemplate
}): {
    distancesFromStopCoordinateWithCoordinates: number[]
    coordinatesByDistanceFromStopCoordinate: {
        [key: number]: HexCoordinate[]
    }
} => {
    let coordinateInfo: {
        distancesFromStopCoordinateWithCoordinates: number[]
        coordinatesByDistanceFromStopCoordinate: {
            [key: number]: HexCoordinate[]
        }
    } = {
        distancesFromStopCoordinateWithCoordinates: [],
        coordinatesByDistanceFromStopCoordinate: {},
    }

    let minimumDistanceFromStopCoordinate =
        distanceRangeFromDestination.minimum || 0
    let maximumDistanceFromStopCoordinate =
        distanceRangeFromDestination?.maximum < maximumDistanceOfMap
            ? distanceRangeFromDestination?.maximum
            : maximumDistanceOfMap

    for (
        let radiusFromStopCoordinate = minimumDistanceFromStopCoordinate;
        radiusFromStopCoordinate <= maximumDistanceFromStopCoordinate;
        radiusFromStopCoordinate++
    ) {
        let coordinatesAtThisDistanceFromStopCoordinate =
            HexCoordinateService.getCoordinatesForRingAroundCoordinate(
                stopCoordinate,
                radiusFromStopCoordinate
            )
                .filter((coordinate) =>
                    TerrainTileMapService.isCoordinateOnMap(
                        gameEngineState.battleOrchestratorState.battleState
                            .missionMap.terrainTileMap,
                        coordinate
                    )
                )
                .filter(
                    (mapCoordinate) =>
                        SearchResultAdapterService.getShortestPathToCoordinate({
                            searchResults,
                            mapCoordinate,
                        }) &&
                        SearchPathAdapterService.getNumberOfMoveActions({
                            path: SearchResultAdapterService.getShortestPathToCoordinate(
                                {
                                    searchResults,
                                    mapCoordinate,
                                }
                            ),
                            movementPerAction:
                                SquaddieService.getSquaddieMovementAttributes({
                                    squaddieTemplate,
                                    battleSquaddie,
                                }).net.movementPerAction,
                        }) > 0
                )
        if (coordinatesAtThisDistanceFromStopCoordinate.length > 0) {
            coordinateInfo.coordinatesByDistanceFromStopCoordinate[
                radiusFromStopCoordinate
            ] = coordinatesAtThisDistanceFromStopCoordinate
            coordinateInfo.distancesFromStopCoordinateWithCoordinates.push(
                radiusFromStopCoordinate
            )
        }
    }

    return coordinateInfo
}

const isAlreadyAtTheLocation = ({
    stopCoordinate,
    gameEngineState,
    battleSquaddieId,
}: {
    stopCoordinate: HexCoordinate
    gameEngineState: GameEngineState
    battleSquaddieId: string
}): boolean => {
    const missionMapCoordinateDatum =
        MissionMapService.getBattleSquaddieAtCoordinate(
            gameEngineState.battleOrchestratorState.battleState.missionMap,
            stopCoordinate
        )

    return missionMapCoordinateDatum.battleSquaddieId === battleSquaddieId
}

const getAsCloseAsPossibleOnlyUsingMovement = (
    gameEngineState: GameEngineState,
    actorBattleSquaddie: BattleSquaddie,
    actorSquaddieTemplate: SquaddieTemplate,
    targetMapCoordinate: HexCoordinate
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
                stopCoordinate: targetMapCoordinate,
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
        moveToThisLocation: SearchPathAdapterService.getHead(closestRoute),
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
