import {HexCoordinate, HexCoordinateToKey, Integer} from "../hexGrid";
import {SearchPath} from "./searchPath";
import {TileFoundDescription} from "./tileFoundDescription";

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

  getRouteToStopLocation(): SearchPath | Error {
    if (this.stopLocation === undefined) {
      return new Error("no stop location was given")
    }
    return this.lowestCostRoutes[HexCoordinateToKey(this.stopLocation)];
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

  getLowestCostRoute(q: Integer, r: Integer): SearchPath {
    const locationKey: string = HexCoordinateToKey({q, r});
    return this.lowestCostRoutes[locationKey];
  }

  getReachableTilesByNumberOfMovementActions(): { [numberOfActions: number]: [{ q: Integer, r: Integer }?] } {
    const reachables: { [numberOfActions: number]: [{ q: Integer, r: Integer }?] } = {};
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
}
