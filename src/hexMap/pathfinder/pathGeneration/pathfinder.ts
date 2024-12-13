import { SearchParameters } from "../searchParameters"
import { TerrainTileMap, TerrainTileMapService } from "../../terrainTileMap"
import {
    SearchPathByLocation,
    SearchResult,
    SearchResultsService,
} from "../searchResults/searchResult"
import { HexCoordinate } from "../../hexCoordinate/hexCoordinate"
import { PriorityQueue } from "../../../utils/priorityQueue"
import { SearchPath, SearchPathService } from "../searchPath"
import { TargetingShapeGenerator } from "../../../battle/targeting/targetingShapeGenerator"
import {
    MapSearchDataLayer,
    MapSearchDataLayerService,
} from "../../../missionMap/mapSearchDataLayer"
import { MovingCostByTerrainType } from "../../hexGridMovementCost"
import { PathContinueConstraint } from "../pathContinueConstraint/pathContinueConstraint"
import { NextNodeIsNotInTheOpenList } from "../pathContinueConstraint/nextNodeIsNotInTheOpenList"
import { NextNodeIsOnTheMap } from "../pathContinueConstraint/nextNodeIsOnTheMap"
import { PathLengthIsLessThanMaximum } from "../pathStopConstraint/pathLengthIsLessThanMaximum"
import { NextNodeHasASquaddie } from "../pathContinueConstraint/nextNodeHasASquaddie"
import { MissionMap } from "../../../missionMap/missionMap"
import { ObjectRepository } from "../../../battle/objectRepository"
import { NextNodeIsAWallAndSearchCannotPassWalls } from "../pathContinueConstraint/nextNodeIsAWallAndSearchCannotPassWalls"
import { isValidValue } from "../../../utils/validityCheck"
import { NextNodeIsAPitAndSearchCannotCrossPits } from "../pathContinueConstraint/nextNodeIsAPitAndSearchCannotCrossPits"
import { NewPathLengthIsLessThanMaximum } from "../pathContinueConstraint/newPathLengthIsLessThanMaximum"
import { PathStopConstraint } from "../pathStopConstraint/pathStopConstraint"
import { PathDoesNotEndOnAWallOrPit } from "../pathStopConstraint/pathDoesNotEndOnAWallOrPit"
import { PathLengthIsMoreThanMinimum } from "../pathStopConstraint/pathLengthIsMoreThanMinimum"
import { PathDoesNotEndOnAnotherSquaddie } from "../pathStopConstraint/pathDoesNotEndOnAnotherSquaddie"

export interface PathfinderWorkingState {
    searchPathQueue: PriorityQueue<SearchPath>
    shapeGenerator: TargetingShapeGenerator
    mapLayers: {
        visited: MapSearchDataLayer
        queued: MapSearchDataLayer
        stopped: MapSearchDataLayer
    }
    shortestPathByLocation: SearchPathByLocation
    addPathConditions: PathContinueConstraint[]
    pathCanStopConditions: PathStopConstraint[]
    stopLocationsReached: HexCoordinate[]
}

export const PathfinderWorkingStateHelper = {
    new: ({
        terrainTileMap,
        searchParameters,
        missionMap,
        objectRepository,
    }: {
        terrainTileMap: TerrainTileMap
        searchParameters: SearchParameters
        missionMap: MissionMap
        objectRepository: ObjectRepository
    }): PathfinderWorkingState => {
        const workingState: PathfinderWorkingState = {
            searchPathQueue: new PriorityQueue<SearchPath>(
                SearchPathService.compare
            ),
            shapeGenerator: searchParameters.pathGenerators.shapeGenerator,
            mapLayers: {
                visited: MapSearchDataLayerService.new({
                    terrainTileMap,
                    initialValue: false,
                }),
                queued: MapSearchDataLayerService.new({
                    terrainTileMap,
                    initialValue: false,
                }),
                stopped: MapSearchDataLayerService.new({
                    terrainTileMap,
                    initialValue: false,
                }),
            },
            shortestPathByLocation: {},
            addPathConditions: [
                new NextNodeIsOnTheMap({
                    terrainMapLayer: MapSearchDataLayerService.new({
                        terrainTileMap,
                        initialValue: false,
                    }),
                }),
                new NextNodeIsAWallAndSearchCannotPassWalls({ missionMap }),
                new NextNodeIsAPitAndSearchCannotCrossPits({ missionMap }),
                new NewPathLengthIsLessThanMaximum(),
                new NextNodeHasASquaddie({
                    missionMap,
                    objectRepository: objectRepository,
                }),
            ],
            pathCanStopConditions: [
                new PathLengthIsLessThanMaximum(),
                new PathDoesNotEndOnAWallOrPit({ missionMap }),
                new PathLengthIsMoreThanMinimum(),
                new PathDoesNotEndOnAnotherSquaddie({
                    missionMap,
                    objectRepository: objectRepository,
                }),
            ],
            stopLocationsReached: [],
        }

        workingState.addPathConditions.push(
            new NextNodeIsNotInTheOpenList({
                enqueuedMapLayer: workingState.mapLayers.queued,
            })
        )
        workingState.addPathConditions.push(
            new NextNodeIsNotInTheOpenList({
                enqueuedMapLayer: workingState.mapLayers.visited,
            })
        )
        workingState.addPathConditions.push(
            new NextNodeIsNotInTheOpenList({
                enqueuedMapLayer: workingState.mapLayers.stopped,
            })
        )

        for (
            let q = 0;
            q <
            TerrainTileMapService.getDimensions(terrainTileMap).numberOfRows;
            q++
        ) {
            workingState.shortestPathByLocation[q] = {}
            for (
                let r = 0;
                r <
                TerrainTileMapService.getDimensions(terrainTileMap)
                    .widthOfWidestRow;
                r++
            ) {
                workingState.shortestPathByLocation[q][r] = undefined
            }
        }

        return workingState
    },
}

export const PathfinderService = {
    search: ({
        searchParameters,
        missionMap,
        objectRepository,
    }: {
        searchParameters: SearchParameters
        missionMap: MissionMap
        objectRepository: ObjectRepository
    }): SearchResult => {
        if (
            !isValidValue(searchParameters.pathGenerators.startCoordinates) ||
            searchParameters.pathGenerators.startCoordinates.length < 1
        ) {
            throw new Error("no start location specified")
        }

        const workingState = PathfinderWorkingStateHelper.new({
            terrainTileMap: missionMap.terrainTileMap,
            searchParameters,
            missionMap,
            objectRepository: objectRepository,
        })
        populateStartingLocations({ searchParameters, workingState })
        generateValidPaths({
            searchParameters,
            workingState,
            terrainTileMap: missionMap.terrainTileMap,
        })
        return exportToSearchResult({ workingState })
    },
}

const populateStartingLocations = ({
    searchParameters,
    workingState,
}: {
    searchParameters: SearchParameters
    workingState: PathfinderWorkingState
}) => {
    searchParameters.pathGenerators.startCoordinates.forEach(
        (startLocation) => {
            MapSearchDataLayerService.setValueOfLocation({
                mapLayer: workingState.mapLayers.queued,
                q: startLocation.q,
                r: startLocation.r,
                value: true,
            })
            const startingPath = SearchPathService.newSearchPath()
            SearchPathService.startNewMovementAction(startingPath, false)
            SearchPathService.add(
                startingPath,
                {
                    hexCoordinate: {
                        q: startLocation.q,
                        r: startLocation.r,
                    },
                    cumulativeMovementCost: 0,
                },
                0
            )
            workingState.searchPathQueue.enqueue(startingPath)
        }
    )
}

const generateValidPaths = ({
    searchParameters,
    workingState,
    terrainTileMap,
}: {
    terrainTileMap: TerrainTileMap
    searchParameters: SearchParameters
    workingState: PathfinderWorkingState
}) => {
    const anyStopConditionWasReached = () => {
        const allStopLocationsFoundStopSearching: boolean =
            searchParameters.goal.stopCoordinates &&
            searchParameters.goal.stopCoordinates.length > 0 &&
            workingState.stopLocationsReached.length >=
                searchParameters.goal.stopCoordinates.length

        return (
            workingState.searchPathQueue.isEmpty() ||
            allStopLocationsFoundStopSearching
        )
    }

    const addValidPathsToWorkingState = ({
        workingState,
        currentSearchPath,
        terrainTileMap,
        searchParameters,
    }: {
        workingState: PathfinderWorkingState
        currentSearchPath: SearchPath
        terrainTileMap: TerrainTileMap
        searchParameters: SearchParameters
    }) => {
        const current: HexCoordinate = {
            q: SearchPathService.getMostRecentLocation(currentSearchPath)
                .hexCoordinate.q,
            r: SearchPathService.getMostRecentLocation(currentSearchPath)
                .hexCoordinate.r,
        }

        function makeNewCandidatePath(nextLocation: HexCoordinate) {
            const terrainType =
                TerrainTileMapService.getTileTerrainTypeAtLocation(
                    terrainTileMap,
                    nextLocation
                )
            let movementCostForThisTile = searchParameters
                .pathContinueConstraints.ignoreTerrainCost
                ? 1
                : MovingCostByTerrainType[terrainType]

            const candidatePath: SearchPath =
                SearchPathService.clone(currentSearchPath)

            const updateNumberOfMovementActions = ({
                searchPathMovementCost,
                searchPath,
                movementCostForThisTile,
                searchParameters,
            }: {
                searchPathMovementCost: number
                searchPath: SearchPath
                movementCostForThisTile: number
                searchParameters: SearchParameters
            }) => {
                if (
                    searchParameters.pathSizeConstraints.movementPerAction ===
                    undefined
                ) {
                    searchPath.currentNumberOfMoveActions = 1
                    return
                }

                const cumulativeMovementCost =
                    searchPathMovementCost + movementCostForThisTile
                searchPath.currentNumberOfMoveActions = Math.ceil(
                    cumulativeMovementCost /
                        searchParameters.pathSizeConstraints.movementPerAction
                )
            }

            updateNumberOfMovementActions({
                searchPath: candidatePath,
                searchPathMovementCost: currentSearchPath.totalMovementCost,
                movementCostForThisTile,
                searchParameters,
            })

            SearchPathService.add(
                candidatePath,
                {
                    hexCoordinate: { ...nextLocation },
                    cumulativeMovementCost:
                        currentSearchPath.totalMovementCost +
                        movementCostForThisTile,
                },
                movementCostForThisTile
            )

            return candidatePath
        }

        workingState.shapeGenerator
            .createNeighboringHexCoordinates(current)
            .forEach((nextLocation) => {
                const candidatePath: SearchPath =
                    makeNewCandidatePath(nextLocation)
                if (
                    workingState.addPathConditions.every(
                        (condition) =>
                            condition.shouldContinue({
                                newPath: candidatePath,
                                searchParameters,
                            }) === true
                    )
                ) {
                    workingState.searchPathQueue.enqueue(candidatePath)
                    MapSearchDataLayerService.setValueOfLocation({
                        mapLayer: workingState.mapLayers.queued,
                        q: nextLocation.q,
                        r: nextLocation.r,
                        value: true,
                    })
                }
            })
    }

    const canStopAtLocation = ({
        currentSearchPath,
    }: {
        currentSearchPath: SearchPath
    }): boolean => {
        return workingState.pathCanStopConditions.every((condition) =>
            condition.squaddieCanStopAtTheEndOfThisPath({
                newPath: currentSearchPath,
                searchParameters,
            })
        )
    }

    while (!anyStopConditionWasReached()) {
        const currentSearchPath: SearchPath =
            workingState.searchPathQueue.dequeue()
        const currentLocation: HexCoordinate =
            SearchPathService.getMostRecentLocation(
                currentSearchPath
            ).hexCoordinate
        MapSearchDataLayerService.setValueOfLocation({
            mapLayer: workingState.mapLayers.visited,
            q: currentLocation.q,
            r: currentLocation.r,
            value: true,
        })

        if (canStopAtLocation({ currentSearchPath })) {
            MapSearchDataLayerService.setValueOfLocation({
                mapLayer: workingState.mapLayers.stopped,
                q: currentLocation.q,
                r: currentLocation.r,
                value: true,
            })
            workingState.shortestPathByLocation[currentLocation.q][
                currentLocation.r
            ] = currentSearchPath
            if (
                searchParameters.goal.stopCoordinates.some(
                    (coordinate) =>
                        coordinate.q === currentLocation.q &&
                        coordinate.r === currentLocation.r
                )
            ) {
                workingState.stopLocationsReached ||= []
                workingState.stopLocationsReached.push({
                    q: currentLocation.q,
                    r: currentLocation.r,
                })
            }
        }

        addValidPathsToWorkingState({
            currentSearchPath,
            workingState,
            terrainTileMap,
            searchParameters,
        })
    }
}

const exportToSearchResult = ({
    workingState,
}: {
    workingState: PathfinderWorkingState
}): SearchResult => {
    return SearchResultsService.new({
        shortestPathByLocation: workingState.shortestPathByLocation,
        stopLocationsReached: workingState.stopLocationsReached,
    })
}
