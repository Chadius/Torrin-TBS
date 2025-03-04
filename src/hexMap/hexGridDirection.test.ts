import { HexGridService } from "./hexGridDirection"
import { HexCoordinate } from "./hexCoordinate/hexCoordinate"
import { describe, expect, it } from "vitest"

describe("Hex Grid Helper", () => {
    describe("Generate offsets of a certain radius", () => {
        it("generates a ring of 0 around the origin", () => {
            const radius0: HexCoordinate[] =
                HexGridService.GetCoordinatesForRingAroundOrigin(0)
            expect(radius0).toHaveLength(1)
            expect(radius0).toContainEqual({ q: 0, r: 0 })
        })
        it("generates a ring of 1 around the origin", () => {
            const radius1: HexCoordinate[] =
                HexGridService.GetCoordinatesForRingAroundOrigin(1)
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
                HexGridService.GetCoordinatesForRingAroundOrigin(2)
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
                HexGridService.GetCoordinatesForRingAroundCoordinate(
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
