import {HexCoordinate, HexCoordinateToKey} from "../hexGrid";
import {SearchPath} from "./searchPath";
import {TileFoundDescription} from "./tileFoundDescription";
import {isError, makeError, makeResult, ResultOrError, unwrapResultOrError} from "../../utils/ResultOrError";

export type SearchResultOptions = {
    stopLocation?: HexCoordinate;
};

export class SearchResults {
    allReachableTiles: TileFoundDescription[];
    lowestCostRoutes: { [key: string]: SearchPath };
    stopLocation?: HexCoordinate;

    constructor(options?: SearchResultOptions) {
        this.allReachableTiles = [];
        this.lowestCostRoutes = {};
        this.stopLocation = options ? options.stopLocation : undefined;
    }

    getRouteToStopLocation(): ResultOrError<SearchPath, Error> {
        if (this.stopLocation === undefined) {
            return makeError(new Error("no stop location was given"))
        }
        const lowestCostRoute = this.lowestCostRoutes[HexCoordinateToKey(this.stopLocation)];
        return makeResult(lowestCostRoute || null);
    }

    getRouteToStopLocationSortedByNumberOfMovementActions(): ResultOrError<TileFoundDescription[][], Error> {
        const routeFoundOrError = this.getRouteToStopLocation();
        if (isError(routeFoundOrError)) {
            return routeFoundOrError;
        }
        const routeFound = unwrapResultOrError(routeFoundOrError);

        return makeResult(
            routeFound
                .getTilesTraveledByNumberOfMovementActions().map((multipleTiles) =>
                multipleTiles.filter(tile => {
                    return routeFound.getTilesTraveled().find(closeTile => (
                        closeTile.r === tile.r
                        && closeTile.q === tile.q
                    ))
                })
            )
        );
    }

    setAllReachableTiles(tilesSearchCanStopAt: TileFoundDescription[]) {
        this.allReachableTiles = [...tilesSearchCanStopAt];
    }

    setLowestCostRoute(searchPath: SearchPath) {
        const locationFound: TileFoundDescription = searchPath.getMostRecentTileLocation();
        const locationKey: string = HexCoordinateToKey(locationFound);
        if (this.lowestCostRoutes[locationKey]) {
            throw new Error(`lowest cost route already exists with key ${locationKey}`);
        }
        this.lowestCostRoutes[locationKey] = searchPath;
    }

    getLowestCostRoute(q: number, r: number): SearchPath {
        const locationKey: string = HexCoordinateToKey({q, r});
        return this.lowestCostRoutes[locationKey];
    }

    getReachableTiles: () => TileFoundDescription[] = () => {
        return [...this.allReachableTiles]
    }

    getReachableTilesByNumberOfMovementActions(): { [numberOfActions: number]: [{ q: number, r: number }?] } {
        const reachables: { [numberOfActions: number]: [{ q: number, r: number }?] } = {};
        Object.entries(this.lowestCostRoutes).forEach(([_, path]) => {
            const numberOfActions: number = path.getNumberOfMovementActions();
            if (!reachables[numberOfActions]) {
                reachables[numberOfActions] = [];
            }

            reachables[numberOfActions].push({
                q: path.getMostRecentTileLocation().q,
                r: path.getMostRecentTileLocation().r,
            })
        })

        return reachables;
    }

    getClosestTilesToDestination(): { coordinate: HexCoordinate, searchPath: SearchPath, distance: number }[] {
        return Object.values(this.lowestCostRoutes).map((searchPath: SearchPath) => {
            const coordinate: HexCoordinate = {
                q: searchPath.getMostRecentTileLocation().q,
                r: searchPath.getMostRecentTileLocation().r,
            };
            const distance: number = Math.abs(coordinate.q - this.stopLocation.q)
                + Math.abs(coordinate.r - this.stopLocation.r);

            return {
                coordinate,
                searchPath,
                distance,
            }
        }).sort((a, b) => {
            if (a.distance < b.distance) {
                return -1;
            }
            if (a.distance > b.distance) {
                return 1;
            }
            return 0;
        });
    }
}
