import {HexCoordinate} from "./hexCoordinate/hexCoordinate";

export enum HexDirection {
    ORIGIN,
    RIGHT,
    LEFT,
    UP_LEFT,
    UP_RIGHT,
    DOWN_LEFT,
    DOWN_RIGHT
}

export const moveOneTileInDirection = (origin: HexCoordinate, direction: HexDirection): HexCoordinate => {
    switch (direction) {
        case HexDirection.RIGHT:
            return new HexCoordinate({q: origin.q, r: origin.r + 1})
        case HexDirection.LEFT:
            return new HexCoordinate({q: origin.q, r: origin.r - 1})
        case HexDirection.UP_RIGHT:
            return new HexCoordinate({q: origin.q - 1, r: origin.r + 1})
        case HexDirection.UP_LEFT:
            return new HexCoordinate({q: origin.q - 1, r: origin.r})
        case HexDirection.DOWN_RIGHT:
            return new HexCoordinate({q: origin.q + 1, r: origin.r})
        case HexDirection.DOWN_LEFT:
            return new HexCoordinate({q: origin.q + 1, r: origin.r - 1})
        case HexDirection.ORIGIN:
        default:
            return origin;
    }
}

export const CreateNewNeighboringCoordinates = (q: number, r: number): HexCoordinate[] => {
    return [
        moveCoordinatesInOneDirection(q, r, HexDirection.RIGHT),
        moveCoordinatesInOneDirection(q, r, HexDirection.LEFT),
        moveCoordinatesInOneDirection(q, r, HexDirection.UP_LEFT),
        moveCoordinatesInOneDirection(q, r, HexDirection.UP_RIGHT),
        moveCoordinatesInOneDirection(q, r, HexDirection.DOWN_LEFT),
        moveCoordinatesInOneDirection(q, r, HexDirection.DOWN_RIGHT),
    ];
}


export const moveCoordinatesInOneDirection = (origin_q: number, origin_r: number, direction: HexDirection): HexCoordinate => {
    switch (direction) {
        case HexDirection.RIGHT:
            return new HexCoordinate({coordinates: [origin_q, origin_r + 1]});
        case HexDirection.LEFT:
            return new HexCoordinate({coordinates: [origin_q, origin_r - 1]});
        case HexDirection.UP_RIGHT:
            return new HexCoordinate({coordinates: [origin_q - 1, origin_r + 1]});
        case HexDirection.UP_LEFT:
            return new HexCoordinate({coordinates: [origin_q - 1, origin_r]});
        case HexDirection.DOWN_RIGHT:
            return new HexCoordinate({coordinates: [origin_q + 1, origin_r]});
        case HexDirection.DOWN_LEFT:
            return new HexCoordinate({coordinates: [origin_q + 1, origin_r - 1]});
        case HexDirection.ORIGIN:
        default:
            return new HexCoordinate({coordinates: [origin_q, origin_r]});
    }
}
