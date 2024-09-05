import { SearchParameters } from "../searchParams"
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
import { AddPathCondition } from "../addPathConditions/addPathCondition"
import { AddPathConditionNotInMapLayer } from "../addPathConditions/addPathConditionNotInMapLayer"
import { AddPathConditionIsInsideMap } from "../addPathConditions/addPathConditionIsInsideMap"
import { AddPathConditionPathIsLessThanTotalMovement } from "../addPathConditions/addPathConditionPathIsLessThanTotalMovement"
import { AddPathConditionSquaddieAffiliation } from "../addPathConditions/addPathConditionSquaddieAffiliation"
import { MissionMap } from "../../../missionMap/missionMap"
import { ObjectRepository } from "../../../battle/objectRepository"
import { AddPathConditionPathLeadsToWall } from "../addPathConditions/addPathConditionPathLeadsToWall"
import { isValidValue } from "../../../utils/validityCheck"
import { AddPathConditionPathLeadsToPit } from "../addPathConditions/addPathConditionPathLeadsToPit"
import { AddPathConditionMaximumDistance } from "../addPathConditions/addPathConditionMaximumDistance"
import { PathCanStopCondition } from "../pathCanStopConditions/pathCanStopCondition"
import { PathCanStopConditionNotAWallOrPit } from "../pathCanStopConditions/pathCanStopConditionNotAWallOrPit"
import { PathCanStopConditionMinimumDistance } from "../pathCanStopConditions/pathCanStopConditionMinimumDistance"
import { PathCanStopConditionNotOnAnotherSquaddie } from "../pathCanStopConditions/pathCanStopConditionNotOnAnotherSquaddie"

export interface PathfinderWorkingState {
    searchPathQueue: PriorityQueue<SearchPath>
    shapeGenerator: TargetingShapeGenerator
    mapLayers: {
        visited: MapSearchDataLayer
        queued: MapSearchDataLayer
        stopped: MapSearchDataLayer
    }
    shortestPathByLocation: SearchPathByLocation
    addPathConditions: AddPathCondition[]
    pathCanStopConditions: PathCanStopCondition[]
    stopLocationsReached: HexCoordinate[]
}

export const PathfinderWorkingStateHelper = {
    new: ({
        terrainTileMap,
        searchParameters,
        missionMap,
        repository,
    }: {
        terrainTileMap: TerrainTileMap
        searchParameters: SearchParameters
        missionMap: MissionMap
        repository: ObjectRepository
    }): PathfinderWorkingState => {
        const workingState: PathfinderWorkingState = {
            searchPathQueue: new PriorityQueue<SearchPath>(
                SearchPathService.compare
            ),
            shapeGenerator: searchParameters.shapeGenerator,
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
                new AddPathConditionIsInsideMap({
                    terrainMapLayer: MapSearchDataLayerService.new({
                        terrainTileMap,
                        initialValue: false,
                    }),
                }),
                new AddPathConditionPathLeadsToWall({ missionMap }),
                new AddPathConditionPathLeadsToPit({ missionMap }),
                new AddPathConditionPathIsLessThanTotalMovement(),
                new AddPathConditionMaximumDistance(),
                new AddPathConditionSquaddieAffiliation({
                    missionMap,
                    repository,
                }),
            ],
            pathCanStopConditions: [
                new PathCanStopConditionNotAWallOrPit({ missionMap }),
                new PathCanStopConditionMinimumDistance(),
                new PathCanStopConditionNotOnAnotherSquaddie({
                    missionMap,
                    repository,
                }),
            ],
            stopLocationsReached: [],
        }

        workingState.addPathConditions.push(
            new AddPathConditionNotInMapLayer({
                enqueuedMapLayer: workingState.mapLayers.queued,
            })
        )
        workingState.addPathConditions.push(
            new AddPathConditionNotInMapLayer({
                enqueuedMapLayer: workingState.mapLayers.visited,
            })
        )
        workingState.addPathConditions.push(
            new AddPathConditionNotInMapLayer({
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

export const PathfinderHelper = {
    search: ({
        searchParameters,
        missionMap,
        repository,
    }: {
        searchParameters: SearchParameters
        missionMap: MissionMap
        repository: ObjectRepository
    }): SearchResult => {
        if (
            !isValidValue(searchParameters.startLocations) ||
            searchParameters.startLocations.length < 1
        ) {
            throw new Error("no start location specified")
        }

        const workingState = PathfinderWorkingStateHelper.new({
            terrainTileMap: missionMap.terrainTileMap,
            searchParameters,
            missionMap,
            repository,
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
    searchParameters.startLocations.forEach((startLocation) => {
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
    })
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
            searchParameters.stopLocations &&
            searchParameters.stopLocations.length > 0 &&
            workingState.stopLocationsReached.length >=
                searchParameters.stopLocations.length

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
            let movementCostForThisTile = searchParameters.ignoreTerrainCost
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
                if (searchParameters.movementPerAction === undefined) {
                    searchPath.currentNumberOfMoveActions = 1
                    return
                }

                const cumulativeMovementCost =
                    searchPathMovementCost + movementCostForThisTile
                searchPath.currentNumberOfMoveActions = Math.ceil(
                    cumulativeMovementCost / searchParameters.movementPerAction
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
                            condition.shouldAddNewPath({
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
            condition.shouldMarkPathLocationAsStoppable({
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
                searchParameters.stopLocations.some(
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
