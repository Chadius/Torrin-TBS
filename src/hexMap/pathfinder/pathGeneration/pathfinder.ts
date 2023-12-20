import {SearchParameters} from "../searchParams";
import {TerrainTileMap} from "../../terrainTileMap";
import {SearchPathByLocation, SearchResult, SearchResultsHelper} from "../searchResults/searchResult";
import {HexCoordinate} from "../../hexCoordinate/hexCoordinate";
import {PriorityQueue} from "../../../utils/priorityQueue";
import {SearchPath, SearchPathHelper} from "../searchPath";
import {TargetingShapeGenerator} from "../../../battle/targeting/targetingShapeGenerator";
import {MapLayer, MapLayerHelper} from "../../../missionMap/mapLayer";
import {HexGridMovementCost, MovingCostByTerrainType} from "../../hexGridMovementCost";
import {AddPathCondition} from "../addPathConditions/addPathCondition";
import {AddPathConditionNotInMapLayer} from "../addPathConditions/addPathConditionNotInMapLayer";
import {AddPathConditionIsInsideMap} from "../addPathConditions/addPathConditionIsInsideMap";
import {
    AddPathConditionPathIsLessThanTotalMovement
} from "../addPathConditions/addPathConditionPathIsLessThanTotalMovement";
import {AddPathConditionSquaddieAffiliation} from "../addPathConditions/addPathConditionSquaddieAffiliation";
import {MissionMap} from "../../../missionMap/missionMap";
import {ObjectRepository} from "../../../battle/objectRepository";
import {AddPathConditionPathLeadsToWall} from "../addPathConditions/addPathConditionPathLeadsToWall";

export interface PathfinderWorkingState {
    searchPathQueue: PriorityQueue<SearchPath>;
    shapeGenerator: TargetingShapeGenerator;
    mapLayers: {
        visited: MapLayer;
        queued: MapLayer;
        stopped: MapLayer;
    };
    shortestPathByLocation: SearchPathByLocation;
    addPathConditions: AddPathCondition[];
}

export const PathfinderWorkingStateHelper = {
    new: ({
              terrainTileMap,
              searchParameters,
              missionMap,
              repository,
          }: {
        terrainTileMap: TerrainTileMap,
        searchParameters: SearchParameters,
        missionMap: MissionMap,
        repository: ObjectRepository,
    }): PathfinderWorkingState => {
        const workingState: PathfinderWorkingState = {
            searchPathQueue: new PriorityQueue<SearchPath>(SearchPathHelper.compare),
            shapeGenerator: searchParameters.shapeGenerator,
            mapLayers: {
                visited: MapLayerHelper.new({terrainTileMap, initialValue: false}),
                queued: MapLayerHelper.new({terrainTileMap, initialValue: false}),
                stopped: MapLayerHelper.new({terrainTileMap, initialValue: false}),
            },
            shortestPathByLocation: {},
            addPathConditions: [],
        };

        workingState.addPathConditions.push(new AddPathConditionNotInMapLayer({enqueuedMapLayer: workingState.mapLayers.queued}));
        workingState.addPathConditions.push(new AddPathConditionNotInMapLayer({enqueuedMapLayer: workingState.mapLayers.visited}));
        workingState.addPathConditions.push(new AddPathConditionNotInMapLayer({enqueuedMapLayer: workingState.mapLayers.stopped}));
        workingState.addPathConditions.push(
            new AddPathConditionIsInsideMap({
                terrainMapLayer: MapLayerHelper.new({terrainTileMap, initialValue: false})
            })
        );
        workingState.addPathConditions.push(new AddPathConditionPathLeadsToWall({missionMap}));
        workingState.addPathConditions.push(new AddPathConditionPathIsLessThanTotalMovement({}));
        workingState.addPathConditions.push(new AddPathConditionSquaddieAffiliation({missionMap, repository}));

        for (let q = 0; q < terrainTileMap.getDimensions().numberOfRows; q++) {
            workingState.shortestPathByLocation[q] = {};
            for (let r = 0; r < terrainTileMap.getDimensions().widthOfWidestRow; r++) {
                workingState.shortestPathByLocation[q][r] = undefined;
            }
        }

        return workingState;
    },
}

export const PathfinderHelper = {
    search: ({searchParameters, missionMap, repository}: {
        searchParameters: SearchParameters;
        missionMap: MissionMap;
        repository: ObjectRepository;
    }): SearchResult => {
        const workingState = PathfinderWorkingStateHelper.new({
            terrainTileMap: missionMap.terrainTileMap,
            searchParameters,
            missionMap,
            repository
        });
        populateStartingLocations({searchParameters, workingState, terrainTileMap: missionMap.terrainTileMap});
        generateValidPaths ({
            searchParameters,
            workingState,
            terrainTileMap: missionMap.terrainTileMap,
        });
        return exportToSearchResult({workingState});
    }
}

const populateStartingLocations = ({
                                       searchParameters,
                                       workingState,
                                       terrainTileMap,
                                   }: {
    searchParameters: SearchParameters;
    workingState: PathfinderWorkingState;
    terrainTileMap: TerrainTileMap;
}) => {
    [
        searchParameters.startLocation
    ].forEach(startLocation => {
        MapLayerHelper.setValueOfLocation({
            mapLayer: workingState.mapLayers.queued,
            q: startLocation.q,
            r: startLocation.r,
            value: true
        });
        const startingPath = SearchPathHelper.newSearchPath();
        SearchPathHelper.add(
            startingPath,
            {
                hexCoordinate: {
                    q: startLocation.q,
                    r: startLocation.r,
                },
                cumulativeMovementCost: 0,
            }, 0);
        SearchPathHelper.startNewMovementAction(startingPath);
        workingState.searchPathQueue.enqueue(startingPath);
    });
}

const generateValidPaths = ({
                                searchParameters,
                                workingState,
                                terrainTileMap,
                            }: {
    terrainTileMap: TerrainTileMap;
    searchParameters: SearchParameters;
    workingState: PathfinderWorkingState;
}) => {
    const anyStopConditionWasReached = () => {
        return workingState.searchPathQueue.isEmpty();
    }

    const addValidPathsToWorkingState = ({
                                             workingState,
                                             currentSearchPath,
                                             terrainTileMap,
                                         }: {
        workingState: PathfinderWorkingState;
        currentSearchPath: SearchPath;
        terrainTileMap: TerrainTileMap;
    }) => {
        const current: HexCoordinate = {
            q: SearchPathHelper.getMostRecentTileLocation(currentSearchPath).hexCoordinate.q,
            r: SearchPathHelper.getMostRecentTileLocation(currentSearchPath).hexCoordinate.r,
        };

        function makeNewCandidatePath(nextLocation: HexCoordinate) {
            const terrainType = terrainTileMap.getTileTerrainTypeAtLocation({
                q: nextLocation.q,
                r: nextLocation.r,
            });
            let movementCostForThisTile = MovingCostByTerrainType[terrainType];

            const candidatePath: SearchPath = SearchPathHelper.clone(currentSearchPath);

            SearchPathHelper.add(
                candidatePath,
                {
                    hexCoordinate: {...nextLocation},
                    cumulativeMovementCost: currentSearchPath.totalMovementCost + movementCostForThisTile,
                },
                movementCostForThisTile,
            );
            return candidatePath;
        }

        workingState.shapeGenerator.createNeighboringHexCoordinates(current).forEach(
            nextLocation => {
                const candidatePath: SearchPath = makeNewCandidatePath(nextLocation);
                if (
                    workingState.addPathConditions.every(condition =>
                        condition.shouldAddNewPath({newPath: candidatePath, searchParameters}) === true
                    )
                ) {
                    workingState.searchPathQueue.enqueue(candidatePath);
                    MapLayerHelper.setValueOfLocation({
                        mapLayer: workingState.mapLayers.queued,
                        q: nextLocation.q,
                        r: nextLocation.r,
                        value: true
                    });
                }
            }
        );
    }

    const canStopAtLocation = ({
                                   currentSearchPath,
                                   terrainTileMap,
                               }: {
        currentSearchPath: SearchPath;
        terrainTileMap: TerrainTileMap;
    }): boolean => {
        const currentLocation: HexCoordinate = {
            q: SearchPathHelper.getMostRecentTileLocation(currentSearchPath).hexCoordinate.q,
            r: SearchPathHelper.getMostRecentTileLocation(currentSearchPath).hexCoordinate.r,
        };

        const terrainType = terrainTileMap.getTileTerrainTypeAtLocation(currentLocation);
        return ![
            HexGridMovementCost.wall,
            HexGridMovementCost.pit,
        ].includes(terrainType);
    }

    while (
        !anyStopConditionWasReached()
        ) {
        const currentSearchPath: SearchPath = workingState.searchPathQueue.dequeue();
        const currentLocation: HexCoordinate = SearchPathHelper.getMostRecentTileLocation(currentSearchPath).hexCoordinate;
        MapLayerHelper.setValueOfLocation({
            mapLayer: workingState.mapLayers.visited,
            q: currentLocation.q,
            r: currentLocation.r,
            value: true,
        });

        if (canStopAtLocation({currentSearchPath, terrainTileMap})) {
            MapLayerHelper.setValueOfLocation({
                mapLayer: workingState.mapLayers.stopped,
                q: currentLocation.q,
                r: currentLocation.r,
                value: true,
            });
            workingState.shortestPathByLocation
                [currentLocation.q]
                [currentLocation.r]
                = currentSearchPath;
        }

        addValidPathsToWorkingState({currentSearchPath, workingState, terrainTileMap});
    }
}

const exportToSearchResult = ({workingState}: { workingState: PathfinderWorkingState }): SearchResult => {
    return SearchResultsHelper.new({
        shortestPathByLocation: workingState.shortestPathByLocation,
    });
}
