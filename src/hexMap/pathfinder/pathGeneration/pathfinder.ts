import { SearchParameters } from "../searchParameters"
import { TerrainTileMap, TerrainTileMapService } from "../../terrainTileMap"
import {
    SearchPathByCoordinate,
    SearchResult,
    SearchResultsService,
} from "../searchResults/searchResult"
import { HexCoordinate } from "../../hexCoordinate/hexCoordinate"
import { PriorityQueue } from "../../../utils/priorityQueue"
import { SearchPath, SearchPathService } from "../searchPath"
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
import {
    CoordinateGeneratorService,
    CoordinateGeneratorShape,
} from "../../../battle/targeting/coordinateGenerator"

interface PathfinderWorkingState {
    searchPathQueue: PriorityQueue<SearchPath>
    coordinateGeneratorShape: CoordinateGeneratorShape
    mapLayers: {
        visited: MapSearchDataLayer
        queued: MapSearchDataLayer
        stopped: MapSearchDataLayer
    }
    shortestPathByCoordinate: SearchPathByCoordinate
    addPathConditions: PathContinueConstraint[]
    pathCanStopConditions: PathStopConstraint[]
    stopCoordinatesReached: HexCoordinate[]
}

const PathfinderWorkingStateHelper = {
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
            coordinateGeneratorShape:
                searchParameters.pathGenerators.coordinateGeneratorShape,
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
            shortestPathByCoordinate: {},
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
            stopCoordinatesReached: [],
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
            workingState.shortestPathByCoordinate[q] = {}
            for (
                let r = 0;
                r <
                TerrainTileMapService.getDimensions(terrainTileMap)
                    .widthOfWidestRow;
                r++
            ) {
                workingState.shortestPathByCoordinate[q][r] = undefined
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
            throw new Error("no start coordinate specified")
        }

        const workingState = PathfinderWorkingStateHelper.new({
            terrainTileMap: missionMap.terrainTileMap,
            searchParameters,
            missionMap,
            objectRepository: objectRepository,
        })
        populateStartingCoordinate({ searchParameters, workingState })
        generateValidPaths({
            searchParameters,
            workingState,
            terrainTileMap: missionMap.terrainTileMap,
        })
        return exportToSearchResult({ workingState })
    },
}

const populateStartingCoordinate = ({
    searchParameters,
    workingState,
}: {
    searchParameters: SearchParameters
    workingState: PathfinderWorkingState
}) => {
    searchParameters.pathGenerators.startCoordinates.forEach(
        (startCoordinate) => {
            MapSearchDataLayerService.setValueOfCoordinate({
                mapLayer: workingState.mapLayers.queued,
                mapCoordinate: startCoordinate,
                value: true,
            })
            const startingPath = SearchPathService.newSearchPath()
            SearchPathService.add(
                startingPath,
                {
                    hexCoordinate: {
                        q: startCoordinate.q,
                        r: startCoordinate.r,
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
        const allstopCoordinatesFoundStopSearching: boolean =
            searchParameters.goal.stopCoordinates &&
            searchParameters.goal.stopCoordinates.length > 0 &&
            workingState.stopCoordinatesReached.length >=
                searchParameters.goal.stopCoordinates.length

        return (
            workingState.searchPathQueue.isEmpty() ||
            allstopCoordinatesFoundStopSearching
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
            q: SearchPathService.getMostRecentCoordinate(currentSearchPath)
                .hexCoordinate.q,
            r: SearchPathService.getMostRecentCoordinate(currentSearchPath)
                .hexCoordinate.r,
        }

        function makeNewCandidatePath(nextCoordinate: HexCoordinate) {
            const terrainType =
                TerrainTileMapService.getTileTerrainTypeAtCoordinate(
                    terrainTileMap,
                    nextCoordinate
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
                    hexCoordinate: { ...nextCoordinate },
                    cumulativeMovementCost:
                        currentSearchPath.totalMovementCost +
                        movementCostForThisTile,
                },
                movementCostForThisTile
            )

            return candidatePath
        }

        CoordinateGeneratorService.generateCoordinates({
            origin: current,
            shape: workingState.coordinateGeneratorShape,
            shapeData: {
                distance: 1,
            },
        }).forEach((nextCoordinate) => {
            const candidatePath: SearchPath =
                makeNewCandidatePath(nextCoordinate)
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
                MapSearchDataLayerService.setValueOfCoordinate({
                    mapLayer: workingState.mapLayers.queued,
                    mapCoordinate: nextCoordinate,
                    value: true,
                })
            }
        })
    }

    const canStopAtCoordinate = ({
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
        const currentCoordinate: HexCoordinate =
            SearchPathService.getMostRecentCoordinate(
                currentSearchPath
            ).hexCoordinate
        MapSearchDataLayerService.setValueOfCoordinate({
            mapLayer: workingState.mapLayers.visited,
            mapCoordinate: currentCoordinate,
            value: true,
        })

        if (canStopAtCoordinate({ currentSearchPath })) {
            MapSearchDataLayerService.setValueOfCoordinate({
                mapLayer: workingState.mapLayers.stopped,
                mapCoordinate: currentCoordinate,
                value: true,
            })
            workingState.shortestPathByCoordinate[currentCoordinate.q][
                currentCoordinate.r
            ] = currentSearchPath
            if (
                searchParameters.goal.stopCoordinates.some(
                    (coordinate) =>
                        coordinate.q === currentCoordinate.q &&
                        coordinate.r === currentCoordinate.r
                )
            ) {
                workingState.stopCoordinatesReached ||= []
                workingState.stopCoordinatesReached.push({
                    q: currentCoordinate.q,
                    r: currentCoordinate.r,
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
        shortestPathByCoordinate: workingState.shortestPathByCoordinate,
        stopCoordinatesReached: workingState.stopCoordinatesReached,
    })
}
