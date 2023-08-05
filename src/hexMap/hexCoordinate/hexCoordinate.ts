import {assertsInteger} from "../../utils/mathAssert";

export class HexCoordinate {
    constructor(params: { q?: number, r?: number, coordinates?: [number, number] }) {
        const qIsUndefined: boolean = params.q === undefined || params.q === null;
        const rIsUndefined: boolean = params.r === undefined || params.r === null;
        const coordinatesIsUndefined: boolean = params.coordinates === undefined || params.coordinates === null;

        if (qIsUndefined && !rIsUndefined) {
            throw new Error("HexCoordinate requires q or coordinates");
        }

        if (!qIsUndefined && rIsUndefined) {
            throw new Error("HexCoordinate requires r or coordinates");
        }

        if (qIsUndefined && rIsUndefined && coordinatesIsUndefined) {
            throw new Error("HexCoordinate requires q & r or coordinates");
        }

        if (coordinatesIsUndefined) {
            assertsInteger(params.q);
            assertsInteger(params.r);

            this.q = params.q;
            this.r = params.r;
        } else {
            assertsInteger(params.coordinates[0]);
            assertsInteger(params.coordinates[1]);

            this.q = params.coordinates[0];
            this.r = params.coordinates[1];
        }
    }

    private _q: number;

    get q(): number {
        return this._q;
    }

    set q(value: number) {
        this._q = value;
    }

    private _r: number;

    get r(): number {
        return this._r;
    }

    set r(value: number) {
        this._r = value;
    }

    toStringKey(): string {
        return `${this.q},${this.r}`;
    }
}

export const HexCoordinateToKey = (coordinate: HexCoordinate): string => {
    return coordinate.toStringKey();
}

export const NewHexCoordinateFromNumberPair = (numberPair: [number, number]): HexCoordinate => {
    return new HexCoordinate({coordinates: numberPair});
}
