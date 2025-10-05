import { BattleSquaddie } from "../battleSquaddie"
import {
    HexCoordinate,
    HexCoordinateService,
} from "../../hexMap/hexCoordinate/hexCoordinate"
import { SquaddieService } from "../../squaddie/squaddieService"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import { SearchResult } from "../../hexMap/pathfinder/searchResults/searchResult"
import { MapHighlightService } from "../animation/mapHighlight"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import {
    MapGraphicsLayerService,
    MapGraphicsLayerType,
} from "../../hexMap/mapLayer/mapGraphicsLayer"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { MissionMap, MissionMapService } from "../../missionMap/missionMap"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import { SearchResultAdapterService } from "../../hexMap/pathfinder/searchResults/searchResultAdapter"
import {
    SearchPathAdapter,
    SearchPathAdapterService,
} from "../../search/searchPathAdapter/searchPathAdapter"
import { MapSearchService } from "../../hexMap/pathfinder/pathGeneration/mapSearch"
import { SearchLimitService } from "../../hexMap/pathfinder/pathGeneration/searchLimit"
import { BattleState } from "../battleState/battleState"
import { SquaddieTurnService } from "../../squaddie/turn"
import { ActionEffectTemplateService } from "../../action/template/actionEffectTemplate"
import { GameEngineState } from "../../gameEngine/gameEngineState/gameEngineState"
import { TargetConstraintsService } from "../../action/targetConstraints"

export const BattleSquaddieSelectorService = {
    createSearchPathAndHighlightMovementPath: ({
        squaddieTemplate,
        battleSquaddie,
        clickedHexCoordinate,
        missionMap,
        objectRepository,
        battleState,
    }: {
        squaddieTemplate: SquaddieTemplate
        battleSquaddie: BattleSquaddie
        clickedHexCoordinate: HexCoordinate
        missionMap: MissionMap
        objectRepository: ObjectRepository
        battleState: BattleState
    }) => {
        return createSearchPath({
            squaddieTemplate,
            battleSquaddie,
            clickedHexCoordinate,
            missionMap,
            objectRepository,
            battleState,
        })
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
    }): SearchPathAdapter | undefined => {
        if (gameEngineState.repository == undefined) return undefined
        const searchResults = getAllTilesSquaddieCanReach({
            missionMap:
                gameEngineState.battleOrchestratorState.battleState.missionMap,
            objectRepository: gameEngineState.repository,
            battleSquaddie,
            squaddieTemplate,
            stopCoordinate,
            actionPointsRemaining,
        })
        if (searchResults == undefined) return undefined
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
            if (searchPathA == undefined) return -1
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
            if (searchPathB == undefined) return -1
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
    getActionTargetCoordinates: ({
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
    }): {
        targetsFoes: HexCoordinate[]
        doesNotTargetFoes: HexCoordinate[]
    } => {
        const { squaddieTemplate, battleSquaddie } =
            ObjectRepositoryService.getSquaddieByBattleId(
                objectRepository,
                battleSquaddieId
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
}

const createSearchPath = ({
    squaddieTemplate,
    battleSquaddie,
    clickedHexCoordinate,
    missionMap,
    objectRepository,
    battleState,
}: {
    squaddieTemplate: SquaddieTemplate
    battleSquaddie: BattleSquaddie
    clickedHexCoordinate: HexCoordinate
    missionMap: MissionMap
    objectRepository: ObjectRepository
    battleState: BattleState
}) => {
    const searchResults = getAllTilesSquaddieCanReach({
        missionMap,
        objectRepository,
        battleSquaddie,
        squaddieTemplate,
        stopCoordinate: clickedHexCoordinate,
    })

    if (searchResults == undefined) return
    const closestRoute = SearchResultAdapterService.getShortestPathToCoordinate(
        {
            searchResults: searchResults,
            mapCoordinate: clickedHexCoordinate,
        }
    )

    if (closestRoute == undefined) {
        return
    }

    battleState.squaddieMovePath ||= []
    battleState.squaddieMovePath.length = 0
    closestRoute.forEach((connection) => {
        battleState.squaddieMovePath!.push(connection)
    })

    const { squaddieIsNormallyControllableByPlayer } =
        SquaddieService.canPlayerControlSquaddieRightNow({
            squaddieTemplate,
            battleSquaddie,
        })

    const routeTilesByDistance =
        MapHighlightService.convertSearchPathToHighlightCoordinates({
            searchPath: closestRoute,
            squaddieIsNormallyControllableByPlayer,
        })
    const actionRangeOnMap = MapGraphicsLayerService.new({
        id: battleSquaddie.battleSquaddieId,
        highlightedTileDescriptions: routeTilesByDistance,
        type: MapGraphicsLayerType.CLICKED_ON_CONTROLLABLE_SQUADDIE,
    })
    TerrainTileMapService.removeAllGraphicsLayers(missionMap.terrainTileMap)
    TerrainTileMapService.addGraphicsLayer(
        missionMap.terrainTileMap,
        actionRangeOnMap
    )
}

const getAllTilesSquaddieCanReach = ({
    battleSquaddie,
    squaddieTemplate,
    stopCoordinate,
    actionPointsRemaining,
    missionMap,
    objectRepository,
}: {
    battleSquaddie: BattleSquaddie
    squaddieTemplate: SquaddieTemplate
    missionMap: MissionMap
    objectRepository: ObjectRepository
    stopCoordinate?: HexCoordinate
    actionPointsRemaining?: number
}): SearchResult | undefined => {
    const { currentMapCoordinate, originMapCoordinate } =
        MissionMapService.getByBattleSquaddieId(
            missionMap,
            battleSquaddie.battleSquaddieId
        )
    if (originMapCoordinate == undefined) return undefined
    if (actionPointsRemaining === undefined) {
        actionPointsRemaining =
            SquaddieTurnService.getActionPointsThatCouldBeSpentOnMovement(
                battleSquaddie.squaddieTurn
            )
    }

    return MapSearchService.calculatePathsToDestinations({
        missionMap,
        objectRepository,
        destinationCoordinates: stopCoordinate ? [stopCoordinate] : [],
        currentMapCoordinate,
        originMapCoordinate,
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
}): {
    targetsFoes: HexCoordinate[]
    doesNotTargetFoes: HexCoordinate[]
} => {
    const attackFoesCoordinates: HexCoordinate[] = []
    const otherCoordinates: HexCoordinate[] = []

    const getCoordinatesToAddToCoordinates = (
        actionRangeResults: SearchResult,
        accumulatedCoordinates: HexCoordinate[]
    ) => {
        return SearchResultAdapterService.getCoordinatesWithPaths(
            actionRangeResults
        )
            .filter(
                (coordinate) =>
                    !HexCoordinateService.includes(
                        accumulatedCoordinates,
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
        .filter(
            (actionTemplate) => actionTemplate.actionEffectTemplates.length > 0
        )
        .forEach((actionTemplate) => {
            allCoordinatesSquaddieCanMoveTo
                .filter((coordinate) => {
                    const path =
                        SearchResultAdapterService.getShortestPathToCoordinate({
                            searchResults: reachableCoordinateSearch,
                            mapCoordinate: coordinate,
                        })

                    const numberOfMoveActionsToReachEndOfPath: number =
                        path != undefined
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
                            (actionTemplate.resourceCost?.actionPoints ?? 0) <=
                        actionPointsRemaining
                    )
                })
                .forEach((coordinate) => {
                    const targetsFoes =
                        ActionEffectTemplateService.doesItTargetFoes(
                            actionTemplate.actionEffectTemplates[0]
                        )

                    actionTemplate.actionEffectTemplates.forEach(
                        (actionSquaddieEffectTemplate) => {
                            let uniqueCoordinates: HexCoordinate[]
                            const actionRangeResults =
                                MapSearchService.calculateAllPossiblePathsFromStartingCoordinate(
                                    {
                                        currentMapCoordinate: coordinate,
                                        originMapCoordinate: coordinate,
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
                                                TargetConstraintsService.getRangeDistance(
                                                    actionTemplate.targetConstraints
                                                )[0],
                                            maximumDistance:
                                                TargetConstraintsService.getRangeDistance(
                                                    actionTemplate.targetConstraints
                                                )[1],
                                        }),
                                    }
                                )

                            if (targetsFoes) {
                                uniqueCoordinates =
                                    getCoordinatesToAddToCoordinates(
                                        actionRangeResults,
                                        attackFoesCoordinates
                                    )
                                attackFoesCoordinates.push(...uniqueCoordinates)
                            } else {
                                uniqueCoordinates =
                                    getCoordinatesToAddToCoordinates(
                                        actionRangeResults,
                                        otherCoordinates
                                    )
                                otherCoordinates.push(...uniqueCoordinates)
                            }
                        }
                    )
                })
        })
    return {
        targetsFoes: attackFoesCoordinates,
        doesNotTargetFoes: otherCoordinates,
    }
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
                .filter((mapCoordinate) => {
                    const shortestPathToCoordinate =
                        SearchResultAdapterService.getShortestPathToCoordinate({
                            searchResults,
                            mapCoordinate,
                        })
                    return (
                        shortestPathToCoordinate != undefined &&
                        SearchPathAdapterService.getNumberOfMoveActions({
                            path: shortestPathToCoordinate,
                            movementPerAction:
                                SquaddieService.getSquaddieMovementAttributes({
                                    squaddieTemplate,
                                    battleSquaddie,
                                }).net.movementPerAction,
                        }) > 0
                    )
                })
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
