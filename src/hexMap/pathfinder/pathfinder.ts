import {HexMap} from "../hexMap";
import {SquaddieID} from "../../squaddie/id";
import {HexCoordinate, Integer} from "../hexGrid";
import {HexMapLocationInfo} from "../HexMapLocationInfo";
import {PriorityQueue} from "../../utils/priorityQueue";
import {HexGridMovementCost, MovingCostByTerrainType} from "../hexGridMovementCost";
import {HexDirection, moveCoordinatesInOneDirection} from "../hexGridDirection";
import {SearchParams} from "./searchParams";
import {SquaddieMovement} from "../../squaddie/movement";

type RequiredOptions = {
  map: HexMap;
}

export type TileFoundDescription = HexCoordinate;

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

  getAllReachableTiles(searchParams: SearchParams): TileFoundDescription[] {
    const tilesSearchCanStopAt: TileFoundDescription[] = [];
    const tileLocationsAlreadyVisited: {[loc: string]: boolean} = {};
    const tileLocationsAlreadyConsideredForQueue: {[loc: string]: boolean} = {};
    const pq = new PriorityQueue();

    this.beginPriorityQueueForSearch(searchParams, pq);

    while(!pq.isEmpty()) {
      let head: SearchPath = pq.dequeue() as SearchPath;
      const mapInfo = this.getMapInformationForLocation(head.getMostRecentTileLocation());

      this.markLocationAsStoppable(mapInfo, head, searchParams, tilesSearchCanStopAt);
      let mostRecentTileLocation = head.getMostRecentTileLocation();
      this.markLocationAsVisited(mostRecentTileLocation, tileLocationsAlreadyVisited);
      let neighboringLocations = this.createNewPathCandidates(mostRecentTileLocation.q, mostRecentTileLocation.r);
      neighboringLocations = this.selectValidPathCandidates(neighboringLocations, tileLocationsAlreadyConsideredForQueue, tileLocationsAlreadyVisited, searchParams, head);
      this.createNewPathsUsingNeighbors(neighboringLocations, tileLocationsAlreadyConsideredForQueue, pq, head);
    }
    return tilesSearchCanStopAt;
  }

  private markLocationAsVisited(mostRecentTileLocation: TileFoundDescription, tileLocationsAlreadyVisited: { [p: string]: boolean }) {
    let mostRecentTileLocationKey: string = this.getObjectKeyForLocation(mostRecentTileLocation.q, mostRecentTileLocation.r);
    tileLocationsAlreadyVisited[mostRecentTileLocationKey] = true;
  }

  private markLocationAsStoppable(mapInfo: HexMapLocationInfo, head: SearchPath, searchParams: SearchParams, tilesSearchCanStopAt: TileFoundDescription[]) {
    if (
      this.squaddieCanStopMovingOnTile(mapInfo)
      && this.isPathAtLeastMinimumDistance(head, searchParams)
    ) {
      tilesSearchCanStopAt.push(head.getMostRecentTileLocation());
    }
  }

  private selectValidPathCandidates(neighboringLocations: [number, number][], tileLocationsAlreadyConsideredForQueue: { [p: string]: boolean }, tileLocationsAlreadyVisited: { [p: string]: boolean }, searchParams: SearchParams, head: SearchPath) {
    neighboringLocations = this.filterNeighborsNotEnqueued(neighboringLocations, tileLocationsAlreadyConsideredForQueue);
    neighboringLocations = this.filterNeighborsNotVisited(neighboringLocations, tileLocationsAlreadyVisited);
    neighboringLocations = this.filterNeighborsOnMap(neighboringLocations);
    return this.filterNeighborsWithinMovementPerAction(neighboringLocations, searchParams, head);
  }

  private createNewPathsUsingNeighbors(neighboringLocations: [number, number][], tileLocationsAlreadyConsideredForQueue: { [p: string]: boolean }, pq: PriorityQueue, head: SearchPath) {
    neighboringLocations.forEach((neighbor) => this.setNeighborAsConsideredForQueue(neighbor, tileLocationsAlreadyConsideredForQueue));
    neighboringLocations.forEach((neighbor) => this.addNeighborNewPath(neighbor, pq, head));
  }

  private squaddieCanStopMovingOnTile(mapInfo: HexMapLocationInfo) {
    return ![HexGridMovementCost.wall, HexGridMovementCost.pit].includes(
        mapInfo.tileTerrainType
      )
      && mapInfo.squaddieId === undefined;
  }

  private beginPriorityQueueForSearch(searchParams: SearchParams, pq: PriorityQueue) {
    const startPath = new SearchPath();
    startPath.add(
      {
        q: searchParams.getStartLocation().q,
        r: searchParams.getStartLocation().r
      },
      0
    );
    pq.enqueue(startPath);
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

  private filterNeighborsWithinMovementPerAction(neighboringLocations: [number, number][], searchParams: SearchParams, head: SearchPath): [number, number][] {
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

  private addNeighborNewPath(neighbor: [number, number], pq: PriorityQueue, head: SearchPath) {
    const mapInfo = this.getMapInformationForLocation({q: neighbor[0] as Integer, r: neighbor[1] as Integer});

    let movementCost = MovingCostByTerrainType[mapInfo.tileTerrainType];

    const neighborPath = new SearchPath(head);
    neighborPath.add(
      {
        q:neighbor[0] as Integer,
        r:neighbor[1] as Integer
      },
      movementCost
    );
    pq.enqueue(neighborPath);
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
      const reachableTiles = this.getAllReachableTiles(
        new SearchParams({
          startLocation: sourceTile,
          numberOfActions: 1,
          minimumDistanceMoved: minimumDistance,
          squaddieMovement: new SquaddieMovement(
          {
            movementPerAction: maximumDistance,
            passThroughWalls,
            crossOverPits: true
          })
        })
      );

      reachableTiles.forEach((reachableTile) => {
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
