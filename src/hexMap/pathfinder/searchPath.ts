import {TileFoundDescription} from "./tileFoundDescription";
import {assertsInteger} from "../../utils/mathAssert";
import {CostReportable} from "../../utils/costReportable";
import {HexCoordinate} from "../hexCoordinate/hexCoordinate";

export interface SearchPath {
    tilesTraveled: TileFoundDescription[];
    tilesTraveledByNumberOfMovementActions: TileFoundDescription[][];
    totalMovementCost: number;
    movementCostSinceStartOfAction: number;
    currentNumberOfMoveActions: number;
    destination?: HexCoordinate;
}

export const SearchPathHelper = {
    getTotalMovementCost: (path: SearchPath): number => {
        return path.totalMovementCost;
    },
    clone: (original: SearchPath): SearchPath => {
        const newPath: SearchPath = {
            tilesTraveled: [...original.tilesTraveled],
            tilesTraveledByNumberOfMovementActions: [...original.tilesTraveledByNumberOfMovementActions],
            totalMovementCost: original.totalMovementCost,
            movementCostSinceStartOfAction: original.movementCostSinceStartOfAction,
            currentNumberOfMoveActions: original.currentNumberOfMoveActions,
            destination: original.destination,
        };
        assertsInteger(newPath.currentNumberOfMoveActions);
        return newPath;
    },
    newSearchPath: (): SearchPath => {
        return {
            tilesTraveled: [],
            tilesTraveledByNumberOfMovementActions: [],
            totalMovementCost: 0,
            movementCostSinceStartOfAction: 0,
            currentNumberOfMoveActions: 0,
            destination: undefined,
        }
    },
    add: (path: SearchPath, tile: TileFoundDescription, cost: number): void => {
        if (path.tilesTraveledByNumberOfMovementActions.length === 0) {
            path.tilesTraveledByNumberOfMovementActions.push([]);
        }
        path.tilesTraveledByNumberOfMovementActions[path.currentNumberOfMoveActions].push(tile);
        path.tilesTraveled.push(tile);

        path.totalMovementCost += cost;
        path.movementCostSinceStartOfAction += cost;

        path.destination = {q: tile.hexCoordinate.q, r: tile.hexCoordinate.r};
    },
    getMostRecentTileLocation: (path: SearchPath): TileFoundDescription => {
        if (path.tilesTraveled.length > 0) {
            return path.tilesTraveled[path.tilesTraveled.length - 1];
        }
        return undefined;
    },
    getTilesTraveled: (path: SearchPath): TileFoundDescription[] => {
        return [...path.tilesTraveled];
    },
    getTotalDistance: (path: SearchPath): number => {
        return path.tilesTraveled ? path.tilesTraveled.length - 1 : 0;
    },
    startNewMovementAction: (path: SearchPath): void => {
        path.movementCostSinceStartOfAction = 0;
        path.currentNumberOfMoveActions++;
        path.tilesTraveledByNumberOfMovementActions[path.currentNumberOfMoveActions] = [];
    },
    getNumberOfMovementActions: (path: SearchPath): number => {
        return path.tilesTraveledByNumberOfMovementActions.length - 1;
    },
    compare: (a: SearchPath, b: SearchPath) => {
        if (a.totalMovementCost < b.totalMovementCost) {
            return -1;
        }
        if (a.totalMovementCost > b.totalMovementCost) {
            return 1;
        }
        return 0;
    }
}

export class SearchPathOld implements CostReportable {
    tilesTraveled: TileFoundDescription[];
    tilesTraveledByNumberOfMovementActions: TileFoundDescription[][];
    totalMovementCost: number;
    movementCostSinceStartOfAction: number;
    currentNumberOfMoveActions: number;
    destination?: HexCoordinate;

    constructor(original?: SearchPath) {
        this.tilesTraveled = original ? [...original.tilesTraveled] : [];
        this.tilesTraveledByNumberOfMovementActions = original ? [...original.tilesTraveledByNumberOfMovementActions] : [];
        this.currentNumberOfMoveActions = original ? original.currentNumberOfMoveActions : 0;
        assertsInteger(this.currentNumberOfMoveActions)

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

        this.destination = {q: tile.hexCoordinate.q, r: tile.hexCoordinate.r};
    }

    getMostRecentTileLocation(): TileFoundDescription {
        if (this.tilesTraveled.length > 0) {
            return this.tilesTraveled[this.tilesTraveled.length - 1];
        }
        return undefined;
    }

    getTotalMovementCost(): number {
        return this.totalMovementCost;
    }

    getDestination(): HexCoordinate {
        return this.destination;
    }

    getTilesTraveled(): TileFoundDescription[] {
        return [...this.tilesTraveled];
    }

    getTotalDistance(): number {
        return this.tilesTraveled ? this.tilesTraveled.length - 1 : 0;
    }

    getTilesTraveledByNumberOfMovementActions(): TileFoundDescription[][] {
        return [...this.tilesTraveledByNumberOfMovementActions];
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
