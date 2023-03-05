import {HexCoordinate, HexCoordinateToKey, Integer} from "../hexGrid";
import {HexMapLocationInfo, SquaddieCanStopMovingOnTile} from "../HexMapLocationInfo";
import {PriorityQueue} from "../../utils/priorityQueue";
import {HexGridMovementCost, MovingCostByTerrainType} from "../hexGridMovementCost";
import {CreateNewPathCandidates} from "../hexGridDirection";
import {SearchParams} from "./searchParams";
import {SquaddieMovement} from "../../squaddie/movement";
import {Trait, TraitCategory, TraitStatusStorage} from "../../trait/traitStatusStorage";
import {SearchResults} from "./searchResults";
import {SearchPath} from "./searchPath";
import {TileFoundDescription} from "./tileFoundDescription";
import {MissionMap} from "../../missionMap/missionMap";
import {isError, unwrapResultOrError} from "../../utils/ResultOrError";

class SearchState {
  tilesSearchCanStopAt: TileFoundDescription[];
  tileLocationsAlreadyVisited: {[loc: string]: boolean};
  tileLocationsAlreadyConsideredForQueue: {[loc: string]: boolean};
  searchPathQueue: PriorityQueue;
  results: SearchResults;

  constructor(searchParams: SearchParams) {
    this.tilesSearchCanStopAt = [];
    this.tileLocationsAlreadyVisited = {};
    this.tileLocationsAlreadyConsideredForQueue = {};
    this.searchPathQueue = new PriorityQueue();
    this.results = new SearchResults({
      stopLocation: searchParams.getStopLocation()
    });
  }

  getTilesSearchCanStopAt(): TileFoundDescription[] {
    return this.tilesSearchCanStopAt;
  }
  hasAlreadyStoppedOnTile(tileLocation: HexCoordinate): boolean {
    return !!this.tilesSearchCanStopAt.find(
      (tile) => tile.q === tileLocation.q && tile.r === tileLocation.r)
  }
  markLocationAsStopped(tileLocation: TileFoundDescription) {
    this.tilesSearchCanStopAt.push({
      q: tileLocation.q,
      r: tileLocation.r,
      movementCost: tileLocation.movementCost,
    });
  }

  markLocationAsVisited(mostRecentTileLocation: TileFoundDescription) {
    let mostRecentTileLocationKey: string = HexCoordinateToKey(mostRecentTileLocation);
    this.tileLocationsAlreadyVisited[mostRecentTileLocationKey] = true;
  }

  hasAlreadyMarkedLocationAsVisited(location: HexCoordinate): boolean {
    let locationKey: string = HexCoordinateToKey(location);
    return this.tileLocationsAlreadyVisited[locationKey] !== true;
  }

  hasAlreadyMarkedLocationAsEnqueued(location: HexCoordinate): boolean {
    let locationKey: string = HexCoordinateToKey(location);
    return this.tileLocationsAlreadyConsideredForQueue[locationKey] !== true;
  }

  markLocationAsConsideredForQueue(mostRecentTileLocation: TileFoundDescription) {
    let mostRecentTileLocationKey: string = HexCoordinateToKey(mostRecentTileLocation);
    this.tileLocationsAlreadyConsideredForQueue[mostRecentTileLocationKey] = true;
  }

  initializeStartPath(startLocation: HexCoordinate) {
    const startingPath = new SearchPath();
    startingPath.add({
      q: startLocation.q,
      r: startLocation.r,
      movementCost: 0,
    }, 0)
    startingPath.startNewMovementAction();
    this.searchPathQueue.enqueue(startingPath);
  }

  extendPathWithNewMovementAction(tile: HexCoordinate) {
    const existingRoute = this.results.getLowestCostRoute(tile.q, tile.r);
    const extendedPath = new SearchPath(existingRoute);
    extendedPath.startNewMovementAction();
    this.searchPathQueue.enqueue(extendedPath);
  }

  hasMorePathsToSearch(): boolean {
    return !this.searchPathQueue.isEmpty();
  }

  nextSearchPath(): SearchPath {
    let nextPath: SearchPath = this.searchPathQueue.dequeue() as SearchPath;
    if (nextPath === undefined) {
      throw new Error(`Search Path Queue is empty, cannot find another`)
    }
    return nextPath;
  }

  addNeighborSearchPathToQueue(tileInfo: TileFoundDescription, head: SearchPath): SearchPath {
    const neighborPath = new SearchPath(head);
    neighborPath.add(
      {
        q: tileInfo.q,
        r: tileInfo.r,
        movementCost: head.getTotalMovementCost() + tileInfo.movementCost,
      },
      tileInfo.movementCost
    );
    this.searchPathQueue.enqueue(neighborPath);
    return neighborPath;
  }

  setAllReachableTiles() {
    this.results.setAllReachableTiles(this.getTilesSearchCanStopAt());
  }

  hasFoundStopLocation(): boolean {
    const routeOrError = this.results.getRouteToStopLocation();
    if (isError(routeOrError)) {
      return false;
    }
    const routeToStopLocation: SearchPath = unwrapResultOrError(routeOrError);
    return routeToStopLocation !== null;
  }

  setLowestCostRoute(searchPath: SearchPath) {
    this.results.setLowestCostRoute(searchPath);
  }
}

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
        let locationKey: string = HexCoordinateToKey(reachableTile);
        inRangeTilesByLocation[locationKey] = reachableTile;
      });
    });

    return Object.values(inRangeTilesByLocation);
  }

  private searchMapForPaths(searchParams: SearchParams): SearchResults {
    const workingSearchState: SearchState = new SearchState(searchParams);

    workingSearchState.initializeStartPath({
      q: searchParams.getStartLocation().q,
      r: searchParams.getStartLocation().r,
    });

    let numberOfMovementActions: number = 1;
    let morePathsAdded: boolean = true;

    while (
      this.hasRemainingMovementActions(searchParams, numberOfMovementActions)
      && !this.hasFoundStopLocation(searchParams, workingSearchState)
      && morePathsAdded
    ) {
      const {
        newAddedSearchPaths,
        movementEndsOnTheseTiles
      } = this.addLegalSearchPaths(
        searchParams,
        workingSearchState,
        searchParams.setup.missionMap
      );

      morePathsAdded = newAddedSearchPaths.length > 0;
      const continueToNextMovementAction: boolean = movementEndsOnTheseTiles.length > 0
        && !this.hasFoundStopLocation(searchParams, workingSearchState);

      if (continueToNextMovementAction) {
        numberOfMovementActions ++;
        movementEndsOnTheseTiles.forEach(tile => workingSearchState.extendPathWithNewMovementAction(tile))
      }
    }
    workingSearchState.setAllReachableTiles();
    return workingSearchState.results;
  }

  private hasRemainingMovementActions(searchParams: SearchParams, numberOfMovementActions: number) {
    return searchParams.getNumberOfActions() === undefined
      || numberOfMovementActions <= searchParams.getNumberOfActions();
  }

  private addLegalSearchPaths(
    searchParams: SearchParams,
    workingSearchState: SearchState,
    missionMap: MissionMap,
  ): {
    newAddedSearchPaths: SearchPath[],
    movementEndsOnTheseTiles: TileFoundDescription[]
  } {
    const newAddedSearchPaths: SearchPath[] = [];
    const movementEndsOnTheseTiles: TileFoundDescription[] = [];

    let arrivedAtTheStopLocation: boolean = false;

    while (
      workingSearchState.hasMorePathsToSearch()
      && !arrivedAtTheStopLocation
    ) {
      let head: SearchPath = workingSearchState.nextSearchPath();
      const mapInfo = missionMap.getMapInformationForLocation(head.getMostRecentTileLocation());

      this.markLocationAsStoppable(mapInfo, head, searchParams, workingSearchState);
      let mostRecentTileLocation = head.getMostRecentTileLocation();
      workingSearchState.markLocationAsVisited(mostRecentTileLocation);

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
        searchParams,
        head,
        missionMap,
        workingSearchState,
      );
      if (neighboringLocations.length === 0 && this.canStopOnThisTile(mapInfo, head, searchParams)) {
        movementEndsOnTheseTiles.push({
          q: mostRecentTileLocation.q,
          r: mostRecentTileLocation.r,
          movementCost: mostRecentTileLocation.movementCost,
        })
      }
        newAddedSearchPaths.push(...this.createNewPathsUsingNeighbors(
          neighboringLocations,
          head,
          missionMap,
          workingSearchState,
        )
      );
    }

    return {
      newAddedSearchPaths,
      movementEndsOnTheseTiles,
    }
  }

  private markLocationAsStoppable(
    mapInfo: HexMapLocationInfo,
    searchPath: SearchPath,
    searchParams: SearchParams,
    workingSearchState: SearchState,
  ) {
    if (
      this.canStopOnThisTile(mapInfo, searchPath, searchParams)
      && !workingSearchState.hasAlreadyStoppedOnTile(searchPath.getMostRecentTileLocation())
    ) {
      workingSearchState.markLocationAsStopped(searchPath.getMostRecentTileLocation())
      workingSearchState.setLowestCostRoute(searchPath);
    }
  }

  private canStopOnThisTile(mapInfo: HexMapLocationInfo, head: SearchPath, searchParams: SearchParams) {
    return this.squaddieCanStopMovingOnTile(mapInfo)
      && this.isPathAtLeastMinimumDistance(head, searchParams);
  }

  private selectValidPathCandidates(
    neighboringLocations: [number, number][],
    searchParams: SearchParams,
    head: SearchPath,
    missionMap: MissionMap,
    workingSearchState: SearchState,
  ): [number, number][] {
    neighboringLocations = this.filterNeighborsNotEnqueued(neighboringLocations, workingSearchState);
    neighboringLocations = this.filterNeighborsNotVisited(neighboringLocations, workingSearchState);
    neighboringLocations = this.filterNeighborsOnMap(missionMap, neighboringLocations);
    return this.filterNeighborsWithinMovementPerAction(neighboringLocations, searchParams, head, missionMap);
  }

  private createNewPathsUsingNeighbors(
    neighboringLocations: [number, number][],
    head: SearchPath,
    missionMap: MissionMap,
    workingSearchState: SearchState,
  ): SearchPath[] {
    const newPaths: SearchPath[] = [];
    neighboringLocations.forEach((neighbor) =>
      workingSearchState.markLocationAsConsideredForQueue({
        q: neighbor[0] as Integer,
        r: neighbor[1] as Integer,
        movementCost: 0,
      })
    );
    neighboringLocations.forEach((neighbor) => {
      const newPath: SearchPath = this.addNeighborNewPath(
        neighbor,
        head,
        missionMap,
        workingSearchState,
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

  private filterNeighborsNotVisited(
    neighboringLocations: [number, number][],
    workingSearchState: SearchState,
  ): [number, number][] {
    return neighboringLocations.filter((neighbor) => {
      return workingSearchState.hasAlreadyMarkedLocationAsVisited({
        q: neighbor[0] as Integer,
        r: neighbor[1] as Integer,
      });
    });
  }

  private filterNeighborsNotEnqueued(
    neighboringLocations: [number, number][],
    workingSearchState: SearchState,
  ): [number, number][] {
    return neighboringLocations.filter((neighbor) => {
      return workingSearchState.hasAlreadyMarkedLocationAsEnqueued({
        q: neighbor[0] as Integer,
        r: neighbor[1] as Integer,
      });
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

  private addNeighborNewPath(
    neighbor: [number, number],
    head: SearchPath,
    missionMap: MissionMap,
    workingSearchState: SearchState,
  ): SearchPath {
    const mapInfo = missionMap.getMapInformationForLocation({q: neighbor[0] as Integer, r: neighbor[1] as Integer});

    let movementCost = MovingCostByTerrainType[mapInfo.tileTerrainType];

    const newPath: SearchPath = workingSearchState.addNeighborSearchPathToQueue(
      {
        q:neighbor[0] as Integer,
        r:neighbor[1] as Integer,
        movementCost: movementCost
      },
      head,
    );
    return newPath;
  }

  private isPathAtLeastMinimumDistance(head: SearchPath, searchParams: SearchParams): boolean {
    if (searchParams.getMinimumDistanceMoved() === undefined || searchParams.getMinimumDistanceMoved() <= 0) {
      return true;
    }
    return head.getTotalCost() >= searchParams.getMinimumDistanceMoved();
  }

  private hasFoundStopLocation(searchParams: SearchParams, workingSearchState: SearchState,): boolean {
    if (searchParams.getStopLocation() === undefined) {
      return false;
    }
    return workingSearchState.hasFoundStopLocation();
  }
}
