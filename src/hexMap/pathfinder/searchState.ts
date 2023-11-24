import {HexCoordinate, HexCoordinateToKey} from "../hexCoordinate/hexCoordinate";
import {PriorityQueue} from "../../utils/priorityQueue";
import {SearchResults} from "./searchResults";
import {TargetingShapeGenerator} from "../../battle/targeting/targetingShapeGenerator";
import {TileFoundDescription} from "./tileFoundDescription";
import {SearchPath, SearchPathHelper} from "./searchPath";
import {getResultOrThrowError, isError, unwrapResultOrError} from "../../utils/ResultOrError";
import {MissionMap} from "../../missionMap/missionMap";
import {IsSquaddieAlive} from "../../squaddie/squaddieService";
import {CreateNewNeighboringCoordinates} from "../hexGridDirection";
import {BattleSquaddieRepository} from "../../battle/battleSquaddieRepository";
import {SearchParameters} from "./searchParams";

export interface SearchState {
    tilesSearchCanStopAt: HexCoordinate[];
    tileLocationsAlreadyVisited: {
        [loc: string]: boolean
    };
    tileLocationsAlreadyConsideredForQueue: {
        [loc: string]: boolean
    };
    searchPathQueue: PriorityQueue<SearchPath>;
    results: SearchResults;
    shapeGenerator: TargetingShapeGenerator;
}

export const SearchStateHelper = {
    newFromSearchParameters: (searchParams: SearchParameters): SearchState => {
        return {
            tilesSearchCanStopAt: [],
            tileLocationsAlreadyVisited: {},
            tileLocationsAlreadyConsideredForQueue: {},
            searchPathQueue: new PriorityQueue<SearchPath>(SearchPathHelper.compare),
            results: new SearchResults({
                stopLocation: searchParams.stopLocation,
            }),
            shapeGenerator: searchParams.shapeGenerator,
        }
    },
    hasAlreadyStoppedOnTile: (searchState: SearchState, tileLocation: HexCoordinate): boolean => {
        return !!searchState.tilesSearchCanStopAt.find(
            (tile) => tile.q === tileLocation.q && tile.r === tileLocation.r)
    },
    markLocationAsStopped: (searchState: SearchState, tileLocation: TileFoundDescription) => {
        searchState.tilesSearchCanStopAt.push({
                q: tileLocation.hexCoordinate.q,
                r: tileLocation.hexCoordinate.r,
            }
        );
    },
    markLocationAsVisited: (searchState: SearchState, mostRecentTileLocation: TileFoundDescription) => {
        let mostRecentTileLocationKey: string = HexCoordinateToKey(mostRecentTileLocation.hexCoordinate);
        searchState.tileLocationsAlreadyVisited[mostRecentTileLocationKey] = true;
    },
    hasAlreadyMarkedLocationAsVisited: (searchState: SearchState, location: HexCoordinate): boolean => {
        return hasAlreadyMarkedLocationAsVisited(searchState, location);
    },
    hasAlreadyMarkedLocationAsEnqueued: (searchState: SearchState, location: HexCoordinate): boolean => {
        let locationKey: string = HexCoordinateToKey(location);
        return searchState.tileLocationsAlreadyConsideredForQueue[locationKey] === true;
    },
    markLocationAsConsideredForQueue: (searchState: SearchState, location: HexCoordinate) => {
        searchState.tileLocationsAlreadyConsideredForQueue[HexCoordinateToKey(location)] = true;
    },
    initializeStartPath: (searchState: SearchState, startLocation: HexCoordinate) => {
        const startingPath = SearchPathHelper.newSearchPath();
        SearchPathHelper.add(
            startingPath,
            {
                hexCoordinate: {
                    q: startLocation.q,
                    r: startLocation.r,
                },
                movementCost: 0,
            }, 0);
        SearchPathHelper.startNewMovementAction(startingPath);
        searchState.searchPathQueue.enqueue(startingPath);
    },
    extendPathWithNewMovementAction: (searchState: SearchState, tile: HexCoordinate) => {
        const existingRoute = searchState.results.getLowestCostRoute(tile.q, tile.r);
        const extendedPath = existingRoute !== undefined
            ? SearchPathHelper.clone(existingRoute)
            : SearchPathHelper.newSearchPath();
        SearchPathHelper.startNewMovementAction(extendedPath);
        searchState.searchPathQueue.enqueue(extendedPath);
    },
    hasMorePathsToSearch: (searchState: SearchState): boolean => {
        return !searchState.searchPathQueue.isEmpty();
    },
    nextSearchPath: (searchState: SearchState): SearchPath => {
        let nextPath: SearchPath = searchState.searchPathQueue.dequeue() as SearchPath;
        if (nextPath === undefined) {
            throw new Error(`Search Path Queue is empty, cannot find another`)
        }
        return nextPath;
    },
    addNeighborSearchPathToQueue: (searchState: SearchState, tileInfo: TileFoundDescription, head: SearchPath, searchParams: SearchParameters): SearchPath => {
        const neighborPath = SearchPathHelper.clone(head);
        const tileInfoMovementCost = searchParams.ignoreTerrainPenalty
            ? 1
            : tileInfo.movementCost;
        SearchPathHelper.add(
            neighborPath,
            {
                hexCoordinate: {
                    q: tileInfo.hexCoordinate.q,
                    r: tileInfo.hexCoordinate.r,
                },
                movementCost: head.totalMovementCost + tileInfoMovementCost,
            },
            tileInfoMovementCost
        );
        searchState.searchPathQueue.enqueue(neighborPath);
        return neighborPath;
    },
    setAllReachableTiles: (searchState: SearchState,) => {
        searchState.results.setAllReachableTiles(searchState.tilesSearchCanStopAt);
    },
    hasFoundStopLocation: (searchState: SearchState): boolean => {
        const routeOrError = searchState.results.getRouteToStopLocation();
        if (isError(routeOrError)) {
            return false;
        }
        const routeToStopLocation: SearchPath = unwrapResultOrError(routeOrError);
        return routeToStopLocation !== null;
    },
    setLowestCostRoute: (searchState: SearchState, searchPath: SearchPath) => {
        searchState.results.setLowestCostRoute(searchPath);
    },
    recordReachableSquaddies: (searchState: SearchState, squaddieRepository: BattleSquaddieRepository, missionMap: MissionMap) => {
        missionMap.getAllSquaddieData().forEach((datum) => {
            const {
                squaddieTemplate,
                battleSquaddie
            } = getResultOrThrowError(squaddieRepository.getSquaddieByBattleId(datum.battleSquaddieId));
            if (!IsSquaddieAlive({squaddieTemplate, battleSquaddie})) {
                return;
            }
            const {
                mapLocation,
                squaddieTemplateId,
            } = datum;

            if (hasAlreadyMarkedLocationAsVisited(searchState, mapLocation)) {
                searchState.results.reachableSquaddies.addSquaddie(squaddieTemplateId, mapLocation);
                searchState.results.reachableSquaddies.addCoordinateCloseToSquaddie(squaddieTemplateId, 0, mapLocation);
            }

            const adjacentLocations: HexCoordinate[] = CreateNewNeighboringCoordinates(mapLocation.q, mapLocation.r);
            searchState.tilesSearchCanStopAt.forEach((description: HexCoordinate) => {
                adjacentLocations.forEach((location: HexCoordinate) => {
                    if (description.q === location.q && description.r === location.r) {
                        searchState.results.reachableSquaddies.addSquaddie(squaddieTemplateId, mapLocation);
                        searchState.results.reachableSquaddies.addCoordinateCloseToSquaddie(squaddieTemplateId, 1, description);
                    }
                });
            });
        });
    },
};

const hasAlreadyMarkedLocationAsVisited = (searchState: SearchState, location: HexCoordinate): boolean => {
    let locationKey: string = HexCoordinateToKey(location);
    return searchState.tileLocationsAlreadyVisited[locationKey] === true;
};

