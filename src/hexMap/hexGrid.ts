import {HexGridMovementCost} from "./hexGridMovementCost";
import {assertsInteger} from "../utils/mathAssert";

export type Integer = number & { _brand: 'Integer' }
export type HexCoordinate = { q: number, r: number }

export const HexCoordinateToKey = (coordinate: HexCoordinate): string => {
    return `${coordinate.q},${coordinate.r}`;
}

export const NewHexCoordinateFromNumberPair = (numberPair: [number, number]): HexCoordinate => {
    return {q: numberPair[0], r: numberPair[1]};
}

export class HexGridTile {
    q: number;
    r: number;
    terrainType: HexGridMovementCost;

    constructor(qcoord: number, rcoord: number, appearance: HexGridMovementCost) {
        assertsInteger(qcoord);
        assertsInteger(rcoord);
        this.r = rcoord;
        this.q = qcoord;
        this.terrainType = appearance;
    }
}
