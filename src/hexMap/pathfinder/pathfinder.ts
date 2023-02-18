import {HexMap} from "../hexMap";
import {SquaddieID} from "../../squaddie/id";
import {HexCoordinate, Integer} from "../hexGrid";
import {HexMapLocationInfo} from "../HexMapLocationInfo";
import {PriorityQueue} from "../../utils/priorityQueue";
import {HexGridMovementCost, MovingCostByTerrainType} from "../hexGridMovementCost";
import {HexDirection, moveCoordinatesInOneDirection} from "../hexGridDirection";
import {SearchParams} from "./searchParams";
import {SquaddieMovement} from "../../squaddie/movement";
import {Trait, TraitCategory, TraitStatusStorage} from "../../trait/traitStatusStorage";

type RequiredOptions = {
  map: HexMap;
}

export type TileFoundDescription = HexCoordinate & {
  numberOfActions: Integer;
};

const compareTiles = (a: TileFoundDescription, b: TileFoundDescription) => {
  if (a.q < b.q) {
    return -1;
  } else if (a.q > b.q) {
    return 1;
  }

  if (a.r < a.r) {
    return -1;
  } else if (a.r > b.r) {
    return 1;
  }

  return 0;
}

export const sortTileDescriptionByNumberOfMovementActions = (
  tilesToOrganize: TileFoundDescription[]
): {[x: Integer]: TileFoundDescription[]} => {
  const sortedTiles: {[numberOfActions: Integer]: TileFoundDescription[]} = tilesToOrganize.reduce(
    (accumulator: {[numberOfActions: Integer]: TileFoundDescription[]}, currentValue: TileFoundDescription) => {
      accumulator[currentValue.numberOfActions] = [];
      return accumulator;
    },
    {}
  )

  tilesToOrganize.forEach((tile) => {
    sortedTiles[tile.numberOfActions].push(tile);
  })

  Object.entries(sortedTiles).forEach(([_, tileList]) => {
    tileList.sort(compareTiles)
  })

  return sortedTiles;
}

class SearchPath implements CostReportable {
  tilesTraveled: TileFoundDescription[];
  totalCost: number;
  destination?: HexCoordinate;

  constructor(original?: SearchPath) {
    this.tilesTraveled = original ? original.tilesTraveled.slice() : [];
    this.totalCost = original ? original.totalCost : 0;
    this.destination = original ? original.destination : undefined;
  }

  add(tile: TileFoundDescription, cost: number) {
    this.tilesTraveled.push(tile);
    this.totalCost += cost;
  }

  getMostRecentTileLocation(): TileFoundDescription {
    if (this.tilesTraveled.length > 0) {
      return this.tilesTraveled[this.tilesTraveled.length - 1];
    }
    return undefined;
  }

  getTotalCost(): number {
    return this.totalCost;
  }
}

class SearchResults {
  AllReachableTiles: TileFoundDescription[];
};

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

  private makeCoordinateKey(q: Integer, r: Integer): string {
    return `${q},${r}`;
  }

  addSquaddie(squaddieID: SquaddieID, coord: HexCoordinate): Error | undefined {
    const coordinateKey: string = this.makeCoordinateKey(coord.q, coord.r);
    if(this.squaddiesByLocation[coordinateKey]) {
      return new Error(`cannot add ${squaddieID.name} to ${coordinateKey}, already occupied by ${this.squaddiesByLocation[coordinateKey].id}`);
    }
    if(!this.map.areCoordinatesOnMap(coord)) {
      return new Error(`cannot add ${squaddieID.name} to ${coordinateKey}, not on map`);
    }

    this.squaddiesByLocation[coordinateKey] = {
      q: coord.q,
      r: coord.r,
      id: squaddieID.id,
    }
    this.squaddiesById[squaddieID.id] = {
      q: coord.q,
      r: coord.r,
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
    const coordinateKey = this.makeCoordinateKey(hexCoordinate.q, hexCoordinate.r);

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

  getAllReachableTiles(searchParams: SearchParams): SearchResults {
    return this.searchMapForPaths(searchParams);
  }

  private searchMapForPaths(searchParams: SearchParams): SearchResults {
    const tilesSearchCanStopAt: TileFoundDescription[] = [];
    const tileLocationsAlreadyVisited: {[loc: string]: boolean} = {};
    const tileLocationsAlreadyConsideredForQueue: {[loc: string]: boolean} = {};
    const searchPathQueue = new PriorityQueue();
    const results: SearchResults = {
      AllReachableTiles: []
    }

    this.addNewStartLocationToSearchQueue(
      searchParams.getStartLocation().q,
      searchParams.getStartLocation().r,
      0 as Integer,
      searchPathQueue,
    );

    let numberOfMovementActions: number = 0;

    while (
      this.hasRemainingMovementActions(searchParams, numberOfMovementActions)
    ) {
      const endpointTiles: TileFoundDescription[] = this.getAllReachableTilesWithin1Movement(
        searchPathQueue,
        searchParams,
        tilesSearchCanStopAt,
        tileLocationsAlreadyVisited,
        tileLocationsAlreadyConsideredForQueue,
        numberOfMovementActions
      );
      numberOfMovementActions ++;
      endpointTiles.forEach((tile) => this.addNewStartLocationToSearchQueue(
        tile.q,
        tile.r,
        numberOfMovementActions as Integer,
        searchPathQueue,
      ))
    }
    results.AllReachableTiles = tilesSearchCanStopAt;
    return results;
  }

  private hasRemainingMovementActions(searchParams: SearchParams, numberOfMovementActions: number) {
    return searchParams.getNumberOfActions() === undefined
      || numberOfMovementActions < searchParams.getNumberOfActions();
  }

  private getAllReachableTilesWithin1Movement(
    tilesToSearch: PriorityQueue,
    searchParams: SearchParams,
    tilesSearchCanStopAt: TileFoundDescription[],
    tileLocationsAlreadyVisited: { [p: string]: boolean },
    tileLocationsAlreadyConsideredForQueue: { [p: string]: boolean },
    numberOfMovementActions: number,
  ): TileFoundDescription[] {
    const endpointTiles: TileFoundDescription[] = [];

    while (!tilesToSearch.isEmpty()) {
      let head: SearchPath = tilesToSearch.dequeue() as SearchPath;
      const mapInfo = this.getMapInformationForLocation(head.getMostRecentTileLocation());

      this.markLocationAsStoppable(mapInfo, head, searchParams, tilesSearchCanStopAt);
      let mostRecentTileLocation = head.getMostRecentTileLocation();
      this.markLocationAsVisited(mostRecentTileLocation, tileLocationsAlreadyVisited);
      let neighboringLocations = this.createNewPathCandidates(mostRecentTileLocation.q, mostRecentTileLocation.r);
      neighboringLocations = this.selectValidPathCandidates(neighboringLocations, tileLocationsAlreadyConsideredForQueue, tileLocationsAlreadyVisited, searchParams, head);
      if (neighboringLocations.length === 0) {
        endpointTiles.push({
          q: mostRecentTileLocation.q,
          r: mostRecentTileLocation.r,
          numberOfActions: mostRecentTileLocation.numberOfActions,
        })
      }
      this.createNewPathsUsingNeighbors(
        neighboringLocations,
        tileLocationsAlreadyConsideredForQueue,
        tilesToSearch,
        head,
        numberOfMovementActions
      );
    }

    return endpointTiles;
  }

  private markLocationAsVisited(mostRecentTileLocation: TileFoundDescription, tileLocationsAlreadyVisited: { [p: string]: boolean }) {
    let mostRecentTileLocationKey: string = this.getObjectKeyForLocation(mostRecentTileLocation.q, mostRecentTileLocation.r);
    tileLocationsAlreadyVisited[mostRecentTileLocationKey] = true;
  }

  private markLocationAsStoppable(
    mapInfo: HexMapLocationInfo,
    head: SearchPath,
    searchParams: SearchParams,
    tilesSearchCanStopAt: TileFoundDescription[]
  ) {
    if (
      this.squaddieCanStopMovingOnTile(mapInfo)
      && this.isPathAtLeastMinimumDistance(head, searchParams)
      && !(tilesSearchCanStopAt.find((tile) => tile.q === head.getMostRecentTileLocation().q && tile.r === head.getMostRecentTileLocation().r))
    ) {
      tilesSearchCanStopAt.push({
        q: head.getMostRecentTileLocation().q,
        r: head.getMostRecentTileLocation().r,
        numberOfActions: head.getMostRecentTileLocation().numberOfActions,
      });
    }
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
    numberOfMovementActions: number,
  ): SearchPath[] {
    const newPaths: SearchPath[] = [];

    neighboringLocations.forEach((neighbor) => this.setNeighborAsConsideredForQueue(neighbor, tileLocationsAlreadyConsideredForQueue));
    neighboringLocations.forEach((neighbor) => {
      const newPath = this.addNeighborNewPath(
        neighbor,
        pq,
        head,
        numberOfMovementActions + 1,
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

  private addNewStartLocationToSearchQueue(q: Integer, r: Integer, numberOfActions: Integer, tilesToSearch: PriorityQueue): void {
    const startPath = new SearchPath();
    startPath.add(
      {
        q,
        r,
        numberOfActions,
      },
      0
    );
    tilesToSearch.enqueue(startPath);
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
      return head.getTotalCost() + movementCost <= searchParams.getMovementPerAction();
    });
  }

  private getObjectKeyForLocation(q: number, r: number) {
    return `${q},${r}`;
  }

  private addNeighborNewPath(
    neighbor: [number, number],
    pq: PriorityQueue,
    head: SearchPath,
    numberOfMovementActions: number,
  ): SearchPath {
    const mapInfo = this.getMapInformationForLocation({q: neighbor[0] as Integer, r: neighbor[1] as Integer});

    let movementCost = MovingCostByTerrainType[mapInfo.tileTerrainType];

    const neighborPath = new SearchPath(head);
    neighborPath.add(
      {
        q:neighbor[0] as Integer,
        r:neighbor[1] as Integer,
        numberOfActions: numberOfMovementActions as Integer,
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

      reachableTiles.AllReachableTiles.forEach((reachableTile) => {
        let locationKey: string = this.getObjectKeyForLocation(reachableTile.q, reachableTile.r);
        inRangeTilesByLocation[locationKey] = reachableTile;
      });
    });

    return Object.values(inRangeTilesByLocation);
  }

  private isPathAtLeastMinimumDistance(head: SearchPath, searchParams: SearchParams): boolean {
    if (searchParams.getMinimumDistanceMoved() === undefined || searchParams.getMinimumDistanceMoved() <= 0) {
      return true;
    }
    return head.getTotalCost() >= searchParams.getMinimumDistanceMoved();
  }
}
