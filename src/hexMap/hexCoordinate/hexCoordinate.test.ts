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

    describe("Generate offsets of a certain radius", () => {
        it("generates a ring of 0 around the origin", () => {
            const radius0: HexCoordinate[] =
                HexCoordinateService.getCoordinatesForRingAroundOrigin(0)
            expect(radius0).toHaveLength(1)
            expect(radius0).toContainEqual({ q: 0, r: 0 })
        })
        it("generates a ring of 1 around the origin", () => {
            const radius1: HexCoordinate[] =
                HexCoordinateService.getCoordinatesForRingAroundOrigin(1)
            expect(radius1).toHaveLength(6)
            expect(radius1).toContainEqual({ q: 0, r: 1 })
            expect(radius1).toContainEqual({ q: -1, r: 1 })
            expect(radius1).toContainEqual({ q: -1, r: 0 })
            expect(radius1).toContainEqual({ q: 0, r: -1 })
            expect(radius1).toContainEqual({ q: 1, r: -1 })
            expect(radius1).toContainEqual({ q: 1, r: 0 })
            expect(radius1).toContainEqual({ q: -1, r: 1 })
        })
        it("generates a ring of 2 around the origin", () => {
            const radius2: HexCoordinate[] =
                HexCoordinateService.getCoordinatesForRingAroundOrigin(2)
            expect(radius2).toHaveLength(12)
            expect(radius2).toContainEqual({ q: 0, r: 2 })

            expect(radius2).toContainEqual({ q: -1, r: 2 })
            expect(radius2).toContainEqual({ q: -2, r: 2 })

            expect(radius2).toContainEqual({ q: -2, r: 1 })
            expect(radius2).toContainEqual({ q: -2, r: 0 })

            expect(radius2).toContainEqual({ q: -1, r: -1 })
            expect(radius2).toContainEqual({ q: 0, r: -2 })

            expect(radius2).toContainEqual({ q: 1, r: -2 })
            expect(radius2).toContainEqual({ q: 2, r: -2 })

            expect(radius2).toContainEqual({ q: 2, r: -1 })
            expect(radius2).toContainEqual({ q: 2, r: 0 })

            expect(radius2).toContainEqual({ q: 1, r: 1 })
        })
        it("generates a ring around a given coordinate", () => {
            const radius2: HexCoordinate[] =
                HexCoordinateService.getCoordinatesForRingAroundCoordinate(
                    { q: 3, r: 5 },
                    2
                )
            expect(radius2).toHaveLength(12)
            expect(radius2).toContainEqual({ q: 3, r: 7 })

            expect(radius2).toContainEqual({ q: 2, r: 7 })
            expect(radius2).toContainEqual({ q: 1, r: 7 })

            expect(radius2).toContainEqual({ q: 1, r: 6 })
            expect(radius2).toContainEqual({ q: 1, r: 5 })

            expect(radius2).toContainEqual({ q: 2, r: 4 })
            expect(radius2).toContainEqual({ q: 1, r: 5 })

            expect(radius2).toContainEqual({ q: 4, r: 3 })
            expect(radius2).toContainEqual({ q: 5, r: 3 })

            expect(radius2).toContainEqual({ q: 5, r: 4 })
            expect(radius2).toContainEqual({ q: 5, r: 5 })

            expect(radius2).toContainEqual({ q: 4, r: 6 })
        })
    })
})
