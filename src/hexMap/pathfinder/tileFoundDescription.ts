import {HexCoordinate} from "../hexCoordinate/hexCoordinate";

export class TileFoundDescription {
    private _hexCoordinate: HexCoordinate;
    private _movementCost: number;

    constructor(params: { hexCoordinate: HexCoordinate, movementCost: number }) {
        this.hexCoordinate = params.hexCoordinate;
        this.movementCost = params.movementCost;
    }

    get movementCost(): number {
        return this._movementCost;
    }

    set movementCost(value: number) {
        this._movementCost = value;
    }

    get hexCoordinate(): HexCoordinate {
        return this._hexCoordinate;
    }

    set hexCoordinate(value: HexCoordinate) {
        this._hexCoordinate = value;
    }

    get q(): number {
        return this.hexCoordinate.q;
    }

    get r(): number {
        return this.hexCoordinate.r;
    }
}

export const TileFoundDescriptionToHexCoordinate = (tile: TileFoundDescription): HexCoordinate => {
    return new HexCoordinate({q: tile.hexCoordinate.q, r: tile.hexCoordinate.r});
}
