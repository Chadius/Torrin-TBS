import { HexGridMovementCost } from "./hexGridMovementCost"
import { assertsInteger } from "../utils/mathAssert"
import { HexCoordinate } from "./hexCoordinate/hexCoordinate"

export type Integer = number & {
    _brand: "Integer"
}

export const HexGridTileHelper = {
    assertIsValid: (data: HexGridTile) => {
        assertsInteger(data.q)
        assertsInteger(data.r)
    },
}

export interface HexGridTile extends HexCoordinate {
    terrainType: HexGridMovementCost
}
