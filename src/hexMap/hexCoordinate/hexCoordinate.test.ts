import { HexCoordinate, HexCoordinateService } from "./hexCoordinate"
import { describe, expect, it } from "vitest"

describe("HexCoordinates", () => {
    it("can create a string key", () => {
        const hexCoordinate: HexCoordinate = { q: 3, r: 10 }
        expect(HexCoordinateService.toString(hexCoordinate)).toBe("(3,10)")
    })
    it("can convert from a string key", () => {
        expect(HexCoordinateService.fromString("(3,10)")).toEqual({
            q: 3,
            r: 10,
        })
        expect(HexCoordinateService.fromString("(-9001,9001)")).toEqual({
            q: -9001,
            r: 9001,
        })
        expect(HexCoordinateService.fromString("Invalid")).toBeUndefined()
    })

    it("knows if a coordinate is included in a list", () => {
        const list: HexCoordinate[] = [
            { q: 0, r: 0 },
            { q: 0, r: 1 },
            { q: 0, r: 2 },
        ]

        expect(HexCoordinateService.includes(list, { q: 0, r: 2 })).toBe(true)
        expect(HexCoordinateService.includes(list, { q: 1, r: 2 })).toBe(false)
    })
    it("knows if two coordinates are the same", () => {
        expect(
            HexCoordinateService.areEqual({ q: 0, r: 2 }, { q: 0, r: 2 })
        ).toBe(true)
        expect(
            HexCoordinateService.areEqual({ q: 0, r: 2 }, { q: 1, r: 2 })
        ).toBe(false)
    })
})
