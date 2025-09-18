import { Trait, TraitStatusStorageService } from "../trait/traitStatusStorage"
import { SquaddieMovement, SquaddieMovementService } from "./movement"
import { describe, expect, it } from "vitest"

describe("movement for squaddies", () => {
    it("can make movement from data", () => {
        const movement: SquaddieMovement = {
            movementPerAction: 3,
            passThroughWalls: true,
            crossOverPits: false,
            ignoreTerrainCost: true,
        }

        expect(movement.movementPerAction).toBe(3)
        expect(movement.passThroughWalls).toBeTruthy()
        expect(movement.crossOverPits).toBeFalsy()
        expect(movement.ignoreTerrainCost).toBeTruthy()
    })

    it("can make movement using traits and movement speed", () => {
        const movement = SquaddieMovementService.new({
            movementPerAction: 3,
            traits: TraitStatusStorageService.newUsingTraitValues({
                [Trait.PASS_THROUGH_WALLS]: true,
                [Trait.HUSTLE]: true,
                [Trait.ELUSIVE]: true,
            }),
        })

        expect(movement.movementPerAction).toBe(3)
        expect(movement.passThroughWalls).toBeTruthy()
        expect(movement.crossOverPits).toBeFalsy()
        expect(movement.ignoreTerrainCost).toBeTruthy()
    })

    describe("sanitize", () => {
        it("can be sanitized to fill in missing fields", () => {
            const movementWithMissingFields: SquaddieMovement = {
                movementPerAction: NaN,
                // @ts-ignore adding invalid value intentionally so I can test sanitization
                passThroughWalls: undefined,
                // @ts-ignore adding invalid value intentionally so I can test sanitization
                crossOverPits: null,
                // @ts-ignore adding invalid value intentionally so I can test sanitization
                ignoreTerrainCost: undefined,
            }
            SquaddieMovementService.sanitize(movementWithMissingFields)
            expect(movementWithMissingFields.movementPerAction).toEqual(0)
            expect(movementWithMissingFields.crossOverPits).toEqual(false)
            expect(movementWithMissingFields.passThroughWalls).toEqual(false)
            expect(movementWithMissingFields.ignoreTerrainCost).toEqual(false)
        })
    })
})
