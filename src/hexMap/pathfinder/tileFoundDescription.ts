import {HexCoordinate} from "../hexCoordinate/hexCoordinate";

export interface TileFoundDescription {
    hexCoordinate: HexCoordinate;
    cumulativeMovementCost: number;
}
