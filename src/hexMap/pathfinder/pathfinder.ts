import {HexCoordinate, Integer} from "../hexGrid";
import {HexMapLocationInfo, SquaddieCanStopMovingOnTile} from "../HexMapLocationInfo";
import {PriorityQueue} from "../../utils/priorityQueue";
import {HexGridMovementCost, MovingCostByTerrainType} from "../hexGridMovementCost";
import {CreateNewPathCandidates, HexDirection, moveCoordinatesInOneDirection} from "../hexGridDirection";
import {SearchParams} from "./searchParams";
import {SquaddieMovement} from "../../squaddie/movement";
import {Trait, TraitCategory, TraitStatusStorage} from "../../trait/traitStatusStorage";
import {SearchResults} from "./searchResults";
import {SearchPath} from "./searchPath";
import {TileFoundDescription} from "./tileFoundDescription";
import {MissionMap} from "../../missionMap/missionMap";

export class Pathfinder {

  constructor() {}
  findPathToStopLocation(searchParams: SearchParams): SearchResults | Error {
    if (searchParams.getStopLocation() === undefined) {
      return new Error ("no stop location was given");
    }
    return this.searchMapForPaths(searchParams);
  }

  getAllReachableTiles(searchParams: SearchParams): SearchResults {
    return this.searchMapForPaths(searchParams);
  }

  getTilesInRange(param: {
    maximumDistance: number;
    minimumDistance?: number;
    passThroughWalls: boolean;
    sourceTiles: TileFoundDescription[],
    missionMap: MissionMap,
  }): TileFoundDescription[] {
    const {
      maximumDistance,
      minimumDistance,
      passThroughWalls,
      sourceTiles,
      missionMap,
    } = param;

    if (maximumDistance < 1) {
      return [...sourceTiles];
    }

    const inRangeTilesByLocation: {[locationKey: string]: TileFoundDescription} = {};

    sourceTiles.forEach((sourceTile) => {
      const reachableTiles: SearchResults = this.getAllReachableTiles(
        new SearchParams({
          startLocation: sourceTile,
          missionMap: missionMap,
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
        searchParams.setup.missionMap
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
    missionMap: MissionMap,
  ): TileFoundDescription[] {
    const endpointTiles: TileFoundDescription[] = [];

    let areThereMorePathsToSearch: boolean = !searchPathQueue.isEmpty();
    let arrivedAtTheStopLocation: boolean = false;

    while (
      areThereMorePathsToSearch
      && !arrivedAtTheStopLocation
    ) {
      let head: SearchPath = searchPathQueue.dequeue() as SearchPath;
      const mapInfo = missionMap.getMapInformationForLocation(head.getMostRecentTileLocation());

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
      neighboringLocations = this.selectValidPathCandidates(
        neighboringLocations,
        tileLocationsAlreadyConsideredForQueue,
        tileLocationsAlreadyVisited,
        searchParams,
        head,
        missionMap
      );
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
        missionMap,
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
    head: SearchPath,
    missionMap: MissionMap,
  ): [number, number][] {
    neighboringLocations = this.filterNeighborsNotEnqueued(neighboringLocations, tileLocationsAlreadyConsideredForQueue);
    neighboringLocations = this.filterNeighborsNotVisited(neighboringLocations, tileLocationsAlreadyVisited);
    neighboringLocations = this.filterNeighborsOnMap(missionMap, neighboringLocations);
    return this.filterNeighborsWithinMovementPerAction(neighboringLocations, searchParams, head, missionMap);
  }

  private createNewPathsUsingNeighbors(
    neighboringLocations: [number, number][],
    tileLocationsAlreadyConsideredForQueue: { [p: string]: boolean },
    pq: PriorityQueue,
    head: SearchPath,
    missionMap: MissionMap,
  ): SearchPath[] {
    const newPaths: SearchPath[] = [];

    neighboringLocations.forEach((neighbor) => this.setNeighborAsConsideredForQueue(neighbor, tileLocationsAlreadyConsideredForQueue));
    neighboringLocations.forEach((neighbor) => {
      const newPath = this.addNeighborNewPath(
        neighbor,
        pq,
        head,
        missionMap,
      );
      newPaths.push(newPath);
    });
    return newPaths;
  }

  private squaddieCanStopMovingOnTile(mapInfo: HexMapLocationInfo) {
    return SquaddieCanStopMovingOnTile(mapInfo);
  }

  private createNewPathCandidates(q: number, r: number): [number, number][] {
    return CreateNewPathCandidates(q, r)
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

  private filterNeighborsOnMap(missionMap: MissionMap, neighboringLocations: [number, number][]): [number, number][] {
    return neighboringLocations.filter((neighbor) => {
      return missionMap.areCoordinatesOnMap({q: neighbor[0] as Integer, r: neighbor[1] as Integer})
    });
  }

  private filterNeighborsWithinMovementPerAction(
    neighboringLocations: [number, number][],
    searchParams: SearchParams,
    head: SearchPath,
    missionMap: MissionMap,
  ): [number, number][] {
    return neighboringLocations.filter((neighbor) => {
      const mapInfo = missionMap.getMapInformationForLocation({q: neighbor[0] as Integer, r: neighbor[1] as Integer});

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
    missionMap: MissionMap,
  ): SearchPath {
    const mapInfo = missionMap.getMapInformationForLocation({q: neighbor[0] as Integer, r: neighbor[1] as Integer});

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
