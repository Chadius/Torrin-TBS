import { HexCoordinate } from "./hexCoordinate/hexCoordinate"

export enum HexDirection {
    ORIGIN,
    RIGHT,
    LEFT,
    UP_LEFT,
    UP_RIGHT,
    DOWN_LEFT,
    DOWN_RIGHT,
}

export const moveOneTileInDirection = (
    origin: HexCoordinate,
    direction: HexDirection
): HexCoordinate => {
    switch (direction) {
        case HexDirection.RIGHT:
            return { q: origin.q, r: origin.r + 1 }
        case HexDirection.LEFT:
            return { q: origin.q, r: origin.r - 1 }
        case HexDirection.UP_RIGHT:
            return { q: origin.q - 1, r: origin.r + 1 }
        case HexDirection.UP_LEFT:
            return { q: origin.q - 1, r: origin.r }
        case HexDirection.DOWN_RIGHT:
            return { q: origin.q + 1, r: origin.r }
        case HexDirection.DOWN_LEFT:
            return { q: origin.q + 1, r: origin.r - 1 }
        case HexDirection.ORIGIN:
        default:
            return origin
    }
}

export const CreateNewNeighboringCoordinates = (
    q: number,
    r: number
): HexCoordinate[] => {
    return [
        MoveCoordinatesInOneDirection(q, r, HexDirection.RIGHT),
        MoveCoordinatesInOneDirection(q, r, HexDirection.LEFT),
        MoveCoordinatesInOneDirection(q, r, HexDirection.UP_LEFT),
        MoveCoordinatesInOneDirection(q, r, HexDirection.UP_RIGHT),
        MoveCoordinatesInOneDirection(q, r, HexDirection.DOWN_LEFT),
        MoveCoordinatesInOneDirection(q, r, HexDirection.DOWN_RIGHT),
    ]
}

export const MoveCoordinatesInOneDirection = (
    originQ: number,
    originR: number,
    direction: HexDirection
): HexCoordinate => {
    switch (direction) {
        case HexDirection.RIGHT:
            return { q: originQ, r: originR + 1 }
        case HexDirection.LEFT:
            return { q: originQ, r: originR - 1 }
        case HexDirection.UP_RIGHT:
            return { q: originQ - 1, r: originR + 1 }
        case HexDirection.UP_LEFT:
            return { q: originQ - 1, r: originR }
        case HexDirection.DOWN_RIGHT:
            return { q: originQ + 1, r: originR }
        case HexDirection.DOWN_LEFT:
            return { q: originQ + 1, r: originR - 1 }
        case HexDirection.ORIGIN:
        default:
            return { q: originQ, r: originR }
    }
}

export const HexGridHelper = {
    GetCoordinatesForRingAroundOrigin: (radius: number): HexCoordinate[] => {
        return GetCoordinatesForRingAroundOrigin(radius)
    },
    GetCoordinatesForRingAroundCoordinate: (
        coordinate: HexCoordinate,
        radius: number
    ): HexCoordinate[] => {
        return GetCoordinatesForRingAroundOrigin(radius).map(
            (ringCoordinate) => {
                return {
                    q: ringCoordinate.q + coordinate.q,
                    r: ringCoordinate.r + coordinate.r,
                }
            }
        )
    },
}

const GetCoordinatesForRingAroundOrigin = (radius: number): HexCoordinate[] => {
    if (radius === 0) {
        return [{ q: 0, r: 0 }]
    }

    let currentCoordinate: HexCoordinate = { q: 0, r: radius }
    const coordinates: HexCoordinate[] = []
    ;[
        HexDirection.UP_LEFT,
        HexDirection.LEFT,
        HexDirection.DOWN_LEFT,
        HexDirection.DOWN_RIGHT,
        HexDirection.RIGHT,
        HexDirection.UP_RIGHT,
    ].forEach((currentDirection) => {
        for (let steps = 0; steps < radius; steps++) {
            currentCoordinate = MoveCoordinatesInOneDirection(
                currentCoordinate.q,
                currentCoordinate.r,
                currentDirection
            )
            coordinates.push(currentCoordinate)
        }
    })

    return coordinates
}
