import {SearchPath} from "./searchPath";
import {TileFoundDescription} from "./tileFoundDescription";
import {isError, makeError, makeResult, ResultOrError, unwrapResultOrError} from "../../utils/ResultOrError";
import {ReachableSquaddiesResults} from "./reachableSquaddiesResults";
import {HexCoordinate, HexCoordinateData, HexCoordinateToKey} from "../hexCoordinate/hexCoordinate";

export type SearchResultOptions = {
    stopLocation?: HexCoordinateData;
};

export class SearchResults {
    allReachableTiles: HexCoordinate[];
    lowestCostRoutes: { [key: string]: SearchPath };
    stopLocation?: HexCoordinateData;
    reachableSquaddies: ReachableSquaddiesResults;

    constructor(options?: SearchResultOptions) {
        this.allReachableTiles = [];
        this.lowestCostRoutes = {};
        this.stopLocation = options ? options.stopLocation : undefined;
        this.reachableSquaddies = new ReachableSquaddiesResults();
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

    setAllReachableTiles(tilesSearchCanStopAt: HexCoordinate[]) {
        this.allReachableTiles = [...tilesSearchCanStopAt];
    }

    setLowestCostRoute(searchPath: SearchPath) {
        const locationFound: TileFoundDescription = searchPath.getMostRecentTileLocation();
        const locationKey: string = HexCoordinateToKey(locationFound.hexCoordinate);
        if (this.lowestCostRoutes[locationKey]) {
            throw new Error(`lowest cost route already exists with key ${locationKey}`);
        }
        this.lowestCostRoutes[locationKey] = searchPath;
    }

    getLowestCostRoute(q: number, r: number): SearchPath {
        const locationKey: string = HexCoordinateToKey(new HexCoordinate({q, r}));
        return this.lowestCostRoutes[locationKey];
    }

    getReachableTiles: () => HexCoordinate[] = () => {
        return [...this.allReachableTiles]
    }

    getReachableTilesByNumberOfMovementActions(): {
        reachableTiles: { [numberOfActionPoints: number]: [{ q: number; r: number }?] };
        sortedMovementActionPoints: number[]
    } {
        const reachableTiles: { [numberOfActionPoints: number]: [{ q: number, r: number }?] } = {};
        Object.entries(this.lowestCostRoutes).forEach(([_, path]) => {
            const numberOfActions: number = path.getNumberOfMovementActions();
            if (!reachableTiles[numberOfActions]) {
                reachableTiles[numberOfActions] = [];
            }

            reachableTiles[numberOfActions].push({
                q: path.getMostRecentTileLocation().q,
                r: path.getMostRecentTileLocation().r,
            })
        })

        const sortedMovementActionPoints = Object.keys(reachableTiles).sort((a: string, b: string) => {
            if (Number(a) < Number(b)) {
                return -1;
            }

            if (Number(b) < Number(a)) {
                return 1;
            }
            return 0;
        }).map((key: string) => Number(key));

        return {
            reachableTiles: reachableTiles,
            sortedMovementActionPoints
        };
    }

    getClosestTilesToDestination(): { coordinate: HexCoordinate, searchPath: SearchPath, distance: number }[] {
        return Object.values(this.lowestCostRoutes).map((searchPath: SearchPath) => {
            const coordinate: HexCoordinate = new HexCoordinate({
                q: searchPath.getMostRecentTileLocation().q,
                r: searchPath.getMostRecentTileLocation().r,
            });
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

    calculateNumberOfMoveActionsRequired(targetLocation: HexCoordinate): number {
        const {reachableTiles: reachableTilesByNumberOfMovementActions} = this.getReachableTilesByNumberOfMovementActions();
        const [numberOfMoveActionsStr, _] =
            Object.entries(reachableTilesByNumberOfMovementActions)
                .find(([_, destination]) => {
                    return destination.some((mapLocation) =>
                        mapLocation.q === targetLocation.q && mapLocation.r === targetLocation.r
                    )
                });
        return parseInt(numberOfMoveActionsStr);
    }

    getReachableSquaddies(): ReachableSquaddiesResults {
        return this.reachableSquaddies;
    }
}
