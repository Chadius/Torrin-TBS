import { HexGridTileHelper } from "./hexGrid"
import { HexGridMovementCost } from "./hexGridMovementCost"
import { describe, expect, it } from "vitest"

describe("HexGrid", () => {
    it("throws an error if non integer coordinates are used for HexGrid", () => {
        const shouldThrowError = () => {
            HexGridTileHelper.assertIsValid({
                q: 5.5,
                r: 4.5,
                terrainType: HexGridMovementCost.singleMovement,
            })
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error)
        expect(() => {
            shouldThrowError()
        }).toThrow("Value must be an integer: 5.5")
    })
})
