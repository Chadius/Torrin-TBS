import {HexCoordinate} from "../hexGrid";

export type TileFoundDescription = HexCoordinate & {
    movementCost: number;
};

export const TileFoundDescriptionToHexCoordinate = (tile: TileFoundDescription): HexCoordinate => {
    return {q: tile.q, r: tile.r};
}
