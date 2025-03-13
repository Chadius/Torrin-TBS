export enum CoordinateSystem {
    UNKNOWN = "UNKNOWN",
    WORLD = "WORLD",
    SCREEN = "SCREEN",
}

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
}

const hexCoordinateToKey = (coordinate: HexCoordinate): string => {
    return `(${coordinate.q},${coordinate.r})`
}
