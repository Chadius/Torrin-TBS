import { assertsInteger } from "../../utils/mathAssert"

export enum CoordinateSystem {
    UNKNOWN = "UNKNOWN",
    WORLD = "WORLD",
    SCREEN = "SCREEN",
}

export interface HexCoordinate {
    q: number
    r: number
}

export const ValidateHexCoordinateOrThrowError = (
    coordinate: HexCoordinate
) => {
    const q = coordinate.q
    const r = coordinate.r

    const qIsUndefined: boolean = q === undefined || q === null
    const rIsUndefined: boolean = r === undefined || r === null

    if (qIsUndefined && !rIsUndefined) {
        throw new Error("HexCoordinate requires q or coordinates")
    }

    if (!qIsUndefined && rIsUndefined) {
        throw new Error("HexCoordinate requires r or coordinates")
    }

    if (qIsUndefined && rIsUndefined) {
        throw new Error("HexCoordinate requires q & r variables")
    }

    assertsInteger(q)
    assertsInteger(r)
}

export const HexCoordinateToKey = (coordinate: HexCoordinate): string => {
    return `${coordinate.q},${coordinate.r}`
}

export const NewHexCoordinateFromNumberPair = (
    numberPair: [number, number]
): HexCoordinate => {
    return { q: numberPair[0], r: numberPair[1] }
}
