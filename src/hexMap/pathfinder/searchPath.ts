import {HexCoordinate, Integer} from "../hexGrid";
import {TileFoundDescription} from "./tileFoundDescription";

export class SearchPath implements CostReportable {
  tilesTraveled: TileFoundDescription[];
  tilesTraveledByNumberOfMovementActions: TileFoundDescription[][];
  totalMovementCost: number;
  movementCostSinceStartOfAction: number;
  currentNumberOfMoveActions: Integer;
  destination?: HexCoordinate;

  constructor(original?: SearchPath) {
    this.tilesTraveled = original ? [...original.tilesTraveled] : [];
    this.tilesTraveledByNumberOfMovementActions = original ? [...original.tilesTraveledByNumberOfMovementActions] : [];
    this.currentNumberOfMoveActions = original ? original.currentNumberOfMoveActions : 0 as Integer;

    this.totalMovementCost = original ? original.totalMovementCost : 0;
    this.movementCostSinceStartOfAction = original ? original.movementCostSinceStartOfAction : 0;

    this.destination = original ? original.destination : undefined;
  }

  add(tile: TileFoundDescription, cost: number) {
    if (this.tilesTraveledByNumberOfMovementActions.length === 0) {
      this.tilesTraveledByNumberOfMovementActions.push([]);
    }
    this.tilesTraveledByNumberOfMovementActions[this.currentNumberOfMoveActions].push(tile);
    this.tilesTraveled.push(tile);

    this.totalMovementCost += cost;
    this.movementCostSinceStartOfAction += cost;

    this.destination = {q: tile.q, r: tile.r};
  }

  getMostRecentTileLocation(): TileFoundDescription {
    if (this.tilesTraveled.length > 0) {
      return this.tilesTraveled[this.tilesTraveled.length - 1];
    }
    return undefined;
  }

  getTotalCost(): number {
    return this.totalMovementCost;
  }

  getDestination(): HexCoordinate {
    return this.destination;
  }

  getTilesTraveled(): TileFoundDescription[] {
    return [...this.tilesTraveled];
  }

  getTilesTraveledByNumberOfMovementActions(): TileFoundDescription[][] {
    return [...this.tilesTraveledByNumberOfMovementActions];
  }

  getTotalMovementCost(): number {
    return this.totalMovementCost;
  }

  getMovementCostSinceStartOfAction(): number {
    return this.movementCostSinceStartOfAction;
  }

  startNewMovementAction(): void {
    this.movementCostSinceStartOfAction = 0;
    this.currentNumberOfMoveActions++;
    this.tilesTraveledByNumberOfMovementActions[this.currentNumberOfMoveActions] = [];
  }

  getNumberOfMovementActions(): number {
    return this.tilesTraveledByNumberOfMovementActions.length - 1;
  }
}