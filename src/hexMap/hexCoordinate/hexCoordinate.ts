export const CoordinateSystem = {
    UNKNOWN: "UNKNOWN",
    WORLD: "WORLD",
    SCREEN: "SCREEN",
} as const satisfies Record<string, string>
export type TCoordinateSystem = EnumLike<typeof CoordinateSystem>

export interface HexCoordinate {
    q: number
    r: number
}

export const HexCoordinateService = {
    toString: (coordinate: HexCoordinate): string =>
        hexCoordinateToKey(coordinate),
    fromString: (s: string): HexCoordinate => {
        const regex = /^\(([^d]+),([^d]+)\)/
        const matches = s.match(regex)
        if (!matches || matches.length < 2) return undefined
        return { q: Number(matches[1]), r: Number(matches[2]) }
    },
    includes: (list: HexCoordinate[], coordinate: HexCoordinate): boolean =>
        list.some(
            (listCoordinate: HexCoordinate) =>
                listCoordinate.q === coordinate.q &&
                listCoordinate.r === coordinate.r
        ),
    areEqual: (a: HexCoordinate, b: HexCoordinate): boolean =>
        a.q === b.q && a.r === b.r,
    getCoordinatesForRingAroundOrigin: (radius: number): HexCoordinate[] => {
        return getCoordinatesForRingAroundOrigin(radius)
    },
    getCoordinatesForRingAroundCoordinate: (
        coordinate: HexCoordinate,
        radius: number
    ): HexCoordinate[] => {
        return getCoordinatesForRingAroundOrigin(radius).map(
            (ringCoordinate) => {
                return {
                    q: ringCoordinate.q + coordinate.q,
                    r: ringCoordinate.r + coordinate.r,
                }
            }
        )
    },
    createNewNeighboringCoordinates: (
        mapCoordinate: HexCoordinate
    ): HexCoordinate[] => createNewNeighboringCoordinates(mapCoordinate),
}

const hexCoordinateToKey = (coordinate: HexCoordinate): string => {
    return `(${coordinate.q},${coordinate.r})`
}

const getCoordinatesForRingAroundOrigin = (radius: number): HexCoordinate[] => {
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
            currentCoordinate = moveCoordinatesInOneDirection(
                currentCoordinate,
                currentDirection
            )
            coordinates.push(currentCoordinate)
        }
    })

    return coordinates
}

const createNewNeighboringCoordinates = (
    mapCoordinate: HexCoordinate
): HexCoordinate[] => {
    return [
        moveCoordinatesInOneDirection(mapCoordinate, HexDirection.RIGHT),
        moveCoordinatesInOneDirection(mapCoordinate, HexDirection.LEFT),
        moveCoordinatesInOneDirection(mapCoordinate, HexDirection.UP_LEFT),
        moveCoordinatesInOneDirection(mapCoordinate, HexDirection.UP_RIGHT),
        moveCoordinatesInOneDirection(mapCoordinate, HexDirection.DOWN_LEFT),
        moveCoordinatesInOneDirection(mapCoordinate, HexDirection.DOWN_RIGHT),
    ]
}

const moveCoordinatesInOneDirection = (
    mapCoordinate: HexCoordinate,
    direction: HexDirection
): HexCoordinate => {
    switch (direction) {
        case HexDirection.RIGHT:
            return { q: mapCoordinate.q, r: mapCoordinate.r + 1 }
        case HexDirection.LEFT:
            return { q: mapCoordinate.q, r: mapCoordinate.r - 1 }
        case HexDirection.UP_RIGHT:
            return { q: mapCoordinate.q - 1, r: mapCoordinate.r + 1 }
        case HexDirection.UP_LEFT:
            return { q: mapCoordinate.q - 1, r: mapCoordinate.r }
        case HexDirection.DOWN_RIGHT:
            return { q: mapCoordinate.q + 1, r: mapCoordinate.r }
        case HexDirection.DOWN_LEFT:
            return { q: mapCoordinate.q + 1, r: mapCoordinate.r - 1 }
        case HexDirection.ORIGIN:
        default:
            return { q: mapCoordinate.q, r: mapCoordinate.r }
    }
}

enum HexDirection {
    ORIGIN,
    RIGHT,
    LEFT,
    UP_LEFT,
    UP_RIGHT,
    DOWN_LEFT,
    DOWN_RIGHT,
}
