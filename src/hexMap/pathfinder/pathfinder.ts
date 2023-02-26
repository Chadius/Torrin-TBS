import {HexMap} from "../hexMap";
import {SquaddieID} from "../../squaddie/id";
import {HexCoordinate, HexCoordinateToKey, Integer} from "../hexGrid";
import {HexMapLocationInfo} from "../HexMapLocationInfo";
import {PriorityQueue} from "../../utils/priorityQueue";
import {HexGridMovementCost, MovingCostByTerrainType} from "../hexGridMovementCost";
import {HexDirection, moveCoordinatesInOneDirection} from "../hexGridDirection";
import {SearchParams} from "./searchParams";
import {SquaddieMovement} from "../../squaddie/movement";
import {Trait, TraitCategory, TraitStatusStorage} from "../../trait/traitStatusStorage";
import {SearchResults} from "./searchResults";
import {SearchPath} from "./searchPath";
import {TileFoundDescription} from "./tileFoundDescription";

type RequiredOptions = {
  map: HexMap;
}

export class Pathfinder {
  map: HexMap;
  squaddiesById: {
    [id: string]: {
      q: Integer;
      r: Integer;
      squaddieID: SquaddieID;
    };
  }

  squaddiesByLocation: {
    [coordinate: string]: {
      q: Integer;
      r: Integer;
      id: string;
    }
  }
  constructor(options: RequiredOptions) {
    this.map = options.map;
    this.squaddiesById = {};
    this.squaddiesByLocation = {};
  }

  addSquaddie(squaddieID: SquaddieID, hexCoordinate: HexCoordinate): Error | undefined {
    const coordinateKey: string = HexCoordinateToKey(hexCoordinate);
    if(this.squaddiesByLocation[coordinateKey]) {
      return new Error(`cannot add ${squaddieID.name} to ${coordinateKey}, already occupied by ${this.squaddiesByLocation[coordinateKey].id}`);
    }
    if(!this.map.areCoordinatesOnMap(hexCoordinate)) {
      return new Error(`cannot add ${squaddieID.name} to ${coordinateKey}, not on map`);
    }

    this.squaddiesByLocation[coordinateKey] = {
      q: hexCoordinate.q,
      r: hexCoordinate.r,
      id: squaddieID.id,
    }
    this.squaddiesById[squaddieID.id] = {
      q: hexCoordinate.q,
      r: hexCoordinate.r,
      squaddieID: squaddieID
    };

    return undefined;
  }

  getSquaddieLocationById(id: string): HexCoordinate {
    const locationInfo = this.squaddiesById[id];
    if (!locationInfo) {
      return {
        q: undefined,
        r: undefined
      };
    }

    return {
      q: locationInfo.q,
      r: locationInfo.r
    }
  }

  getMapInformationForLocation(hexCoordinate: HexCoordinate): HexMapLocationInfo {
    const coordinateKey: string = HexCoordinateToKey(hexCoordinate);

    const squaddieAtLocation = this.squaddiesByLocation[coordinateKey];
    const squaddieId = squaddieAtLocation ? squaddieAtLocation.id : undefined;

    const tileTerrainType = this.map.getTileTerrainTypeAtLocation(hexCoordinate);
    const q = tileTerrainType ? hexCoordinate.q : undefined;
    const r = tileTerrainType ? hexCoordinate.r : undefined;

    return {
      q,
      r,
      squaddieId,
      tileTerrainType
    }
  }

  findPathToStopLocation(searchParams: SearchParams): SearchResults | Error {
    if (searchParams.getStopLocation() === undefined) {
      return new Error ("no stop location was given");
    }
    return this.searchMapForPaths(searchParams);
  }

  getAllReachableTiles(searchParams: SearchParams): SearchResults {
    return this.searchMapForPaths(searchParams);
  }

  getTilesInRange(param: { maximumDistance: number; minimumDistance?: number; passThroughWalls: boolean; sourceTiles: TileFoundDescription[] }): TileFoundDescription[] {
    const {
      maximumDistance,
      minimumDistance,
      passThroughWalls,
      sourceTiles
    } = param;

    if (maximumDistance < 1) {
      return [...sourceTiles];
    }

    const inRangeTilesByLocation: {[locationKey: string]: TileFoundDescription} = {};

    sourceTiles.forEach((sourceTile) => {
      const reachableTiles: SearchResults = this.getAllReachableTiles(
        new SearchParams({
          startLocation: sourceTile,
          numberOfActions: 1,
          minimumDistanceMoved: minimumDistance,
          squaddieMovement: new SquaddieMovement(
            {
              movementPerAction: maximumDistance,
              traits: new TraitStatusStorage({
                [Trait.PASS_THROUGH_WALLS]: passThroughWalls,
                [Trait.CROSS_OVER_PITS]: true,
              }).filterCategory(TraitCategory.MOVEMENT)
            })
        })
      );

      reachableTiles.allReachableTiles.forEach((reachableTile) => {
        let locationKey: string = this.getObjectKeyForLocation(reachableTile.q, reachableTile.r);
        inRangeTilesByLocation[locationKey] = reachableTile;
      });
    });

    return Object.values(inRangeTilesByLocation);
  }

  private searchMapForPaths(searchParams: SearchParams): SearchResults {
    const tilesSearchCanStopAt: TileFoundDescription[] = [];
    const tileLocationsAlreadyVisited: {[loc: string]: boolean} = {};
    const tileLocationsAlreadyConsideredForQueue: {[loc: string]: boolean} = {};
    const searchPathQueue = new PriorityQueue();
    const results: SearchResults = new SearchResults({
      stopLocation: searchParams.getStopLocation()
    });

    const startingPath = new SearchPath();
    startingPath.add({
      q: searchParams.getStartLocation().q,
      r: searchParams.getStartLocation().r,
      movementCost: 0,
    }, 0)
    startingPath.startNewMovementAction();
    searchPathQueue.enqueue(startingPath);

    let numberOfMovementActions: number = 1;

    while (
      this.hasRemainingMovementActions(searchParams, numberOfMovementActions)
      && !this.hasFoundStopLocation(searchParams, results)
    ) {
      const endpointTiles: TileFoundDescription[] = this.addLegalSearchPaths(
        searchPathQueue,
        searchParams,
        tilesSearchCanStopAt,
        tileLocationsAlreadyVisited,
        tileLocationsAlreadyConsideredForQueue,
        results,
      );

      const continueToNextMovementAction: boolean = !this.hasFoundStopLocation(searchParams, results);

      if (continueToNextMovementAction) {
        numberOfMovementActions ++;

        endpointTiles.forEach((tile) => {
          const existingRoute = results.getLowestCostRoute(tile.q, tile.r);
          const extendedPath = new SearchPath(existingRoute);
          extendedPath.startNewMovementAction();
          searchPathQueue.enqueue(extendedPath);
        })
      }
    }
    results.setAllReachableTiles(tilesSearchCanStopAt);
    return results;
  }

  private hasRemainingMovementActions(searchParams: SearchParams, numberOfMovementActions: number) {
    return searchParams.getNumberOfActions() === undefined
      || numberOfMovementActions <= searchParams.getNumberOfActions();
  }

  private addLegalSearchPaths(
    searchPathQueue: PriorityQueue,
    searchParams: SearchParams,
    tilesSearchCanStopAt: TileFoundDescription[],
    tileLocationsAlreadyVisited: { [p: string]: boolean },
    tileLocationsAlreadyConsideredForQueue: { [p: string]: boolean },
    searchResults: SearchResults,
  ): TileFoundDescription[] {
    const endpointTiles: TileFoundDescription[] = [];

    let areThereMorePathsToSearch: boolean = !searchPathQueue.isEmpty();
    let arrivedAtTheStopLocation: boolean = false;

    while (
      areThereMorePathsToSearch
      && !arrivedAtTheStopLocation
    ) {
      let head: SearchPath = searchPathQueue.dequeue() as SearchPath;
      const mapInfo = this.getMapInformationForLocation(head.getMostRecentTileLocation());

      this.markLocationAsStoppable(mapInfo, head, searchParams, tilesSearchCanStopAt, searchResults);
      let mostRecentTileLocation = head.getMostRecentTileLocation();
      this.markLocationAsVisited(mostRecentTileLocation, tileLocationsAlreadyVisited);

      if (
        searchParams.getStopLocation() !== undefined
        && head.getMostRecentTileLocation().q === searchParams.getStopLocation().q
        && head.getMostRecentTileLocation().r === searchParams.getStopLocation().r
      ) {
        arrivedAtTheStopLocation = true;
        continue;
      }

      let neighboringLocations = this.createNewPathCandidates(mostRecentTileLocation.q, mostRecentTileLocation.r);
      neighboringLocations = this.selectValidPathCandidates(neighboringLocations, tileLocationsAlreadyConsideredForQueue, tileLocationsAlreadyVisited, searchParams, head);
      if (neighboringLocations.length === 0 && this.canStopOnThisTile(mapInfo, head, searchParams)) {
        endpointTiles.push({
          q: mostRecentTileLocation.q,
          r: mostRecentTileLocation.r,
          movementCost: mostRecentTileLocation.movementCost,
        })
      }
      this.createNewPathsUsingNeighbors(
        neighboringLocations,
        tileLocationsAlreadyConsideredForQueue,
        searchPathQueue,
        head,
      );

      areThereMorePathsToSearch = !searchPathQueue.isEmpty();
    }

    return endpointTiles;
  }

  private markLocationAsVisited(mostRecentTileLocation: TileFoundDescription, tileLocationsAlreadyVisited: { [p: string]: boolean }) {
    let mostRecentTileLocationKey: string = this.getObjectKeyForLocation(mostRecentTileLocation.q, mostRecentTileLocation.r);
    tileLocationsAlreadyVisited[mostRecentTileLocationKey] = true;
  }

  private markLocationAsStoppable(
    mapInfo: HexMapLocationInfo,
    searchPath: SearchPath,
    searchParams: SearchParams,
    tilesSearchCanStopAt: TileFoundDescription[],
    searchResults: SearchResults,
  ) {
    if (
      this.canStopOnThisTile(mapInfo, searchPath, searchParams)
      && !(tilesSearchCanStopAt.find((tile) => tile.q === searchPath.getMostRecentTileLocation().q && tile.r === searchPath.getMostRecentTileLocation().r))
    ) {
      tilesSearchCanStopAt.push({
        q: searchPath.getMostRecentTileLocation().q,
        r: searchPath.getMostRecentTileLocation().r,
        movementCost: searchPath.getMostRecentTileLocation().movementCost,
      });

      searchResults.setLowestCostRoute(searchPath);
    }
  }

  private canStopOnThisTile(mapInfo: HexMapLocationInfo, head: SearchPath, searchParams: SearchParams) {
    return this.squaddieCanStopMovingOnTile(mapInfo)
      && this.isPathAtLeastMinimumDistance(head, searchParams);
  }

  private selectValidPathCandidates(
    neighboringLocations: [number, number][],
    tileLocationsAlreadyConsideredForQueue: { [p: string]: boolean },
    tileLocationsAlreadyVisited: { [p: string]: boolean },
    searchParams: SearchParams,
    head: SearchPath
  ): [number, number][] {
    neighboringLocations = this.filterNeighborsNotEnqueued(neighboringLocations, tileLocationsAlreadyConsideredForQueue);
    neighboringLocations = this.filterNeighborsNotVisited(neighboringLocations, tileLocationsAlreadyVisited);
    neighboringLocations = this.filterNeighborsOnMap(neighboringLocations);
    return this.filterNeighborsWithinMovementPerAction(neighboringLocations, searchParams, head);
  }

  private createNewPathsUsingNeighbors(
    neighboringLocations: [number, number][],
    tileLocationsAlreadyConsideredForQueue: { [p: string]: boolean },
    pq: PriorityQueue,
    head: SearchPath,
  ): SearchPath[] {
    const newPaths: SearchPath[] = [];

    neighboringLocations.forEach((neighbor) => this.setNeighborAsConsideredForQueue(neighbor, tileLocationsAlreadyConsideredForQueue));
    neighboringLocations.forEach((neighbor) => {
      const newPath = this.addNeighborNewPath(
        neighbor,
        pq,
        head,
      );
      newPaths.push(newPath);
    });
    return newPaths;
  }

  private squaddieCanStopMovingOnTile(mapInfo: HexMapLocationInfo) {
    return ![HexGridMovementCost.wall, HexGridMovementCost.pit].includes(
        mapInfo.tileTerrainType
      )
      && mapInfo.squaddieId === undefined;
  }

  private createNewPathCandidates(q: number, r: number): [number, number][] {
    return [
      moveCoordinatesInOneDirection(q, r, HexDirection.RIGHT),
      moveCoordinatesInOneDirection(q, r, HexDirection.LEFT),
      moveCoordinatesInOneDirection(q, r, HexDirection.UP_LEFT),
      moveCoordinatesInOneDirection(q, r, HexDirection.UP_RIGHT),
      moveCoordinatesInOneDirection(q, r, HexDirection.DOWN_LEFT),
      moveCoordinatesInOneDirection(q, r, HexDirection.DOWN_RIGHT),
    ];
  }

  private filterNeighborsNotVisited(neighboringLocations: [number, number][], tileLocationsAlreadyVisited: {[loc: string]: boolean}): [number, number][] {
    return neighboringLocations.filter((neighbor) => {
      let locationKey: string = this.getObjectKeyForLocation(neighbor[0], neighbor[1]);
      return tileLocationsAlreadyVisited[locationKey] !== true;
    });
  }

  private filterNeighborsNotEnqueued(neighboringLocations: [number, number][], tileLocationsAlreadyEnqueued: {[loc: string]: boolean}): [number, number][] {
    return neighboringLocations.filter((neighbor) => {
      let locationKey: string = this.getObjectKeyForLocation(neighbor[0], neighbor[1]);
      return tileLocationsAlreadyEnqueued[locationKey] !== true;
    });
  }

  private filterNeighborsOnMap(neighboringLocations: [number, number][]): [number, number][] {
    return neighboringLocations.filter((neighbor) => {
      return this.map.areCoordinatesOnMap({q: neighbor[0] as Integer, r: neighbor[1] as Integer})
    });
  }

  private filterNeighborsWithinMovementPerAction(
    neighboringLocations: [number, number][],
    searchParams: SearchParams,
    head: SearchPath
  ): [number, number][] {
    return neighboringLocations.filter((neighbor) => {
      const mapInfo = this.getMapInformationForLocation({q: neighbor[0] as Integer, r: neighbor[1] as Integer});

      if (!searchParams.getPassThroughWalls() && mapInfo.tileTerrainType === HexGridMovementCost.wall) {
        return false;
      }

      if (!searchParams.getCrossOverPits() && mapInfo.tileTerrainType === HexGridMovementCost.pit) {
        return false;
      }

      if (searchParams.getMovementPerAction() === undefined) {
        return true;
      }

      let movementCost = MovingCostByTerrainType[mapInfo.tileTerrainType];
      return head.getMovementCostSinceStartOfAction() + movementCost <= searchParams.getMovementPerAction();
    });
  }

  private getObjectKeyForLocation(q: number, r: number) {
    return `${q},${r}`;
  }

  private addNeighborNewPath(
    neighbor: [number, number],
    pq: PriorityQueue,
    head: SearchPath,
  ): SearchPath {
    const mapInfo = this.getMapInformationForLocation({q: neighbor[0] as Integer, r: neighbor[1] as Integer});

    let movementCost = MovingCostByTerrainType[mapInfo.tileTerrainType];

    const neighborPath = new SearchPath(head);
    neighborPath.add(
      {
        q:neighbor[0] as Integer,
        r:neighbor[1] as Integer,
        movementCost: head.getTotalMovementCost() + movementCost
      },
      movementCost
    );
    pq.enqueue(neighborPath);

    return neighborPath;
  }

  private setNeighborAsConsideredForQueue(neighbor: [number, number], tileLocationsAlreadyConsideredForQueue: {[loc: string]: boolean}) {
    const neighborKey = this.getObjectKeyForLocation(neighbor[0], neighbor[1]);
    tileLocationsAlreadyConsideredForQueue[neighborKey] = true;
  }

  private isPathAtLeastMinimumDistance(head: SearchPath, searchParams: SearchParams): boolean {
    if (searchParams.getMinimumDistanceMoved() === undefined || searchParams.getMinimumDistanceMoved() <= 0) {
      return true;
    }
    return head.getTotalCost() >= searchParams.getMinimumDistanceMoved();
  }

  private hasFoundStopLocation(searchParams: SearchParams, searchResults: SearchResults): boolean {
    if (searchParams.getStopLocation() === undefined) {
      return false;
    }
    return searchResults.getRouteToStopLocation() !== undefined;
  }
}
