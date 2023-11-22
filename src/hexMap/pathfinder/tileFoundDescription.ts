import {HexCoordinate} from "../hexCoordinate/hexCoordinate";

export interface TileFoundDescription {
    hexCoordinate: HexCoordinate;
    movementCost: number;
}
