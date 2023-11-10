import {HexGridMovementCost} from "./hexGridMovementCost";
import {assertsInteger} from "../utils/mathAssert";

export type Integer = number & { _brand: 'Integer' }

export const HexGridTileHelper = {
    assertIsValid: (data: HexGridTile) => {
        assertsInteger(data.q);
        assertsInteger(data.r);
    }
}

export interface HexGridTile {
    q: number;
    r: number;
    terrainType: HexGridMovementCost;
}
