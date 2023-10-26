import {assertsInteger} from "../../utils/mathAssert";

export interface HexCoordinateData {
    q: number;
    r: number;
}

export class HexCoordinate implements HexCoordinateData {
    constructor({q, r, coordinates, data}: {
        q?: number,
        r?: number,
        coordinates?: [number, number],
        data?: HexCoordinateData
    }) {
        const qIsUndefined: boolean = q === undefined || q === null;
        const rIsUndefined: boolean = r === undefined || r === null;
        const coordinatesIsUndefined: boolean = coordinates === undefined || coordinates === null;
        const dataIsUndefined: boolean = data === undefined || data.q === undefined || data.r === undefined;

        if (qIsUndefined && !rIsUndefined) {
            throw new Error("HexCoordinate requires q or coordinates");
        }

        if (!qIsUndefined && rIsUndefined) {
            throw new Error("HexCoordinate requires r or coordinates");
        }

        if (qIsUndefined && rIsUndefined && coordinatesIsUndefined && dataIsUndefined) {
            throw new Error("HexCoordinate requires q & r variables");
        }

        if (!dataIsUndefined) {
            assertsInteger(data.q);
            assertsInteger(data.r);

            this.q = data.q;
            this.r = data.r;
        } else if (!coordinatesIsUndefined) {
            assertsInteger(coordinates[0]);
            assertsInteger(coordinates[1]);

            this.q = coordinates[0];
            this.r = coordinates[1];
        } else {
            assertsInteger(q);
            assertsInteger(r);

            this.q = q;
            this.r = r;
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

export const HexCoordinateToKey = (coordinate: HexCoordinateData): string => {
    const hexCoord = new HexCoordinate({data: coordinate});
    return hexCoord.toStringKey();
}

export const NewHexCoordinateFromNumberPair = (numberPair: [number, number]): HexCoordinate => {
    return new HexCoordinate({coordinates: numberPair});
}
