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
    }): SearchPath => {
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
            return searchResults.shortestPathByCoordinate[stopCoordinate.q][
                stopCoordinate.r
            ]
        }

        let coordinateInfo =
            getReachableCoordinatesByDistanceFromstopCoordinate({
                distanceRangeFromDestination,
                maximumDistanceOfMap: TerrainTileMapService.getMaximumDistance(
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap.terrainTileMap
                ),
                stopCoordinate,
                gameEngineState,
                searchResults,
            })

        if (
            coordinateInfo.distancesFromstopCoordinateWithCoordinates.length ===
            0
        ) {
            return undefined
        }

        coordinateInfo.distancesFromstopCoordinateWithCoordinates.sort()

        let coordinatesToConsider: HexCoordinate[] =
            coordinateInfo.coordinatesByDistanceFromstopCoordinate[
                coordinateInfo.distancesFromstopCoordinateWithCoordinates[
                    coordinateInfo.distancesFromstopCoordinateWithCoordinates
                        .length - 1
                ]
            ]

        coordinatesToConsider.sort((a, b) => {
            const searchPathA = searchResults.shortestPathByCoordinate[a.q][a.r]
            const searchPathB = searchResults.shortestPathByCoordinate[b.q][b.r]
            return sortByNumberOfMoveActions(searchPathA, searchPathB)
        })

        const closestRouteThatCostsFewestActions = coordinatesToConsider[0]
        return searchResults.shortestPathByCoordinate[
            closestRouteThatCostsFewestActions.q
        ][closestRouteThatCostsFewestActions.r]
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
        const { squaddieTemplate } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                objectRepository,
                battleSquaddieId
            )
        )

        const allCoordinatesSquaddieCanMoveTo: HexCoordinate[] =
            SearchResultsService.getStoppableCoordinates(
                reachableCoordinateSearch
            )
        return getSquaddieAttackCoordinates(
            squaddieTemplate,
            objectRepository,
            allCoordinatesSquaddieCanMoveTo,
            reachableCoordinateSearch,
            actionPointsRemaining,
            missionMap
        )
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
                                stopCoordinate: targetMapCoordinate,
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

    const closestRoute: SearchPath =
        SearchResultsService.getShortestPathToCoordinate(
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
                    canCrossThroughUnfriendlySquaddies:
                        SquaddieService.getSquaddieMovementAttributes({
                            battleSquaddie,
                            squaddieTemplate,
                        }).net.passThroughSquaddies,
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
                stopCoordinates: stopCoordinate ? [stopCoordinate] : [],
            },
        }),
        missionMap:
            gameEngineState.battleOrchestratorState.battleState.missionMap,
        objectRepository: gameEngineState.repository,
    })
}

const getSquaddieAttackCoordinates = (
    squaddieTemplate: SquaddieTemplate,
    repository: ObjectRepository,
    allCoordinatesSquaddieCanMoveTo: HexCoordinate[],
    reachableCoordinateSearch: SearchResult,
    actionPointsRemaining: number,
    missionMap: MissionMap
): HexCoordinate[] => {
    const attackCoordinates: HexCoordinate[] = []
    squaddieTemplate.actionTemplateIds
        .map((id) =>
            ObjectRepositoryService.getActionTemplateById(repository, id)
        )
        .forEach((actionTemplate) => {
            allCoordinatesSquaddieCanMoveTo
                .filter((coordinate) => {
                    const path: SearchPath =
                        reachableCoordinateSearch.shortestPathByCoordinate[
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
                            let uniqueCoordinates: HexCoordinate[] = []

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

                            uniqueCoordinates =
                                SearchResultsService.getStoppableCoordinates(
                                    actionRangeResults
                                )
                                    .filter(
                                        (coordinate) =>
                                            !attackCoordinates.some(
                                                (attackLoc) =>
                                                    attackLoc.q ===
                                                        coordinate.q &&
                                                    attackLoc.r === coordinate.r
                                            )
                                    )
                                    .filter(
                                        (coordinate) =>
                                            !allCoordinatesSquaddieCanMoveTo.some(
                                                (moveLoc) =>
                                                    moveLoc.q ===
                                                        coordinate.q &&
                                                    moveLoc.r === coordinate.r
                                            )
                                    )
                            attackCoordinates.push(...uniqueCoordinates)
                        }
                    )
                })
        })
    return attackCoordinates
}

const getReachableCoordinatesByDistanceFromstopCoordinate = ({
    distanceRangeFromDestination,
    maximumDistanceOfMap,
    stopCoordinate,
    gameEngineState,
    searchResults,
}: {
    distanceRangeFromDestination: {
        minimum: number
        maximum: number
    }
    maximumDistanceOfMap: number
    stopCoordinate: HexCoordinate
    gameEngineState: GameEngineState
    searchResults: SearchResult
}): {
    distancesFromstopCoordinateWithCoordinates: number[]
    coordinatesByDistanceFromstopCoordinate: {
        [key: number]: HexCoordinate[]
    }
} => {
    let coordinateInfo: {
        distancesFromstopCoordinateWithCoordinates: number[]
        coordinatesByDistanceFromstopCoordinate: {
            [key: number]: HexCoordinate[]
        }
    } = {
        distancesFromstopCoordinateWithCoordinates: [],
        coordinatesByDistanceFromstopCoordinate: {},
    }

    let minimumDistanceFromstopCoordinate =
        distanceRangeFromDestination.minimum || 0
    let maximumDistanceFromstopCoordinate =
        distanceRangeFromDestination?.maximum < maximumDistanceOfMap
            ? distanceRangeFromDestination?.maximum
            : maximumDistanceOfMap

    for (
        let radiusFromstopCoordinate = minimumDistanceFromstopCoordinate;
        radiusFromstopCoordinate <= maximumDistanceFromstopCoordinate;
        radiusFromstopCoordinate++
    ) {
        let coordinatesAtThisDistanceFromstopCoordinate =
            HexGridService.GetCoordinatesForRingAroundCoordinate(
                stopCoordinate,
                radiusFromstopCoordinate
            )
                .filter((coordinate) =>
                    TerrainTileMapService.isCoordinateOnMap(
                        gameEngineState.battleOrchestratorState.battleState
                            .missionMap.terrainTileMap,
                        coordinate
                    )
                )
                .filter(
                    (coordinate) =>
                        searchResults.shortestPathByCoordinate?.[
                            coordinate.q
                        ]?.[coordinate.r]
                )
                .filter(
                    (coordinate) =>
                        searchResults.shortestPathByCoordinate[coordinate.q][
                            coordinate.r
                        ].currentNumberOfMoveActions > 0
                )
        if (coordinatesAtThisDistanceFromstopCoordinate.length > 0) {
            coordinateInfo.coordinatesByDistanceFromstopCoordinate[
                radiusFromstopCoordinate
            ] = coordinatesAtThisDistanceFromstopCoordinate
            coordinateInfo.distancesFromstopCoordinateWithCoordinates.push(
                radiusFromstopCoordinate
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
