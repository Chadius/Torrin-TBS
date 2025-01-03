import { describe, it, expect } from "vitest"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"
import {
    CoordinateGeneratorService,
    CoordinateGeneratorShape,
} from "./coordinateGenerator"

describe("Coordinate Generator", () => {
    it("can generate coordinates from origin in a BLOOM shape", () => {
        const coordinates: HexCoordinate[] =
            CoordinateGeneratorService.generateCoordinates({
                origin: { q: 0, r: 0 },
                shape: CoordinateGeneratorShape.BLOOM,
                shapeData: {
                    distance: 2,
                },
            })

        const expectedCoordinates = [
            { q: 0, r: 2 },
            { q: 0, r: 1 },
            { q: 0, r: 0 },
            { q: 0, r: -1 },
            { q: 0, r: -2 },

            { q: -1, r: -1 },
            { q: -1, r: 0 },
            { q: -1, r: 1 },
            { q: -1, r: 2 },

            { q: -2, r: 0 },
            { q: -2, r: 1 },
            { q: -2, r: 2 },

            { q: 1, r: -2 },
            { q: 1, r: -1 },
            { q: 1, r: 0 },
            { q: 1, r: 1 },

            { q: 2, r: -2 },
            { q: 2, r: -1 },
            { q: 2, r: 0 },
        ]

        expect(coordinates).toEqual(expect.arrayContaining(expectedCoordinates))
        expect(coordinates).toHaveLength(expectedCoordinates.length)
    })
})
