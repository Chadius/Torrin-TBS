import {HexCoordinate} from "../hexGrid";

export type TileFoundDescription = HexCoordinate & {
  movementCost: number;
};
