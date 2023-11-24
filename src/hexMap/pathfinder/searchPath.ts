import {TileFoundDescription} from "./tileFoundDescription";
import {assertsInteger} from "../../utils/mathAssert";
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
