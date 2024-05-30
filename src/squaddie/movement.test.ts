import {
    CreateNewSquaddieMovementWithTraits,
    SquaddieMovement,
    SquaddieMovementService,
} from "./movement"
import { Trait, TraitStatusStorageService } from "../trait/traitStatusStorage"

describe("movement for squaddies", () => {
    it("can make movement from data", () => {
        const movement: SquaddieMovement = {
            movementPerAction: 3,
            passThroughWalls: true,
            crossOverPits: false,
        }

        expect(movement.movementPerAction).toBe(3)
        expect(movement.passThroughWalls).toBeTruthy()
        expect(movement.crossOverPits).toBeFalsy()
    })

    it("can make movement using traits and movement speed", () => {
        const movement = CreateNewSquaddieMovementWithTraits({
            movementPerAction: 3,
            traits: TraitStatusStorageService.newUsingTraitValues({
                [Trait.PASS_THROUGH_WALLS]: true,
            }),
        })

        expect(movement.movementPerAction).toBe(3)
        expect(movement.passThroughWalls).toBeTruthy()
        expect(movement.crossOverPits).toBeFalsy()
    })

    describe("sanitize", () => {
        it("can be sanitized to fill in missing fields", () => {
            const movementWithMissingFields: SquaddieMovement = {
                movementPerAction: NaN,
                passThroughWalls: undefined,
                crossOverPits: null,
            }
            SquaddieMovementService.sanitize(movementWithMissingFields)
            expect(movementWithMissingFields.movementPerAction).toEqual(0)
            expect(movementWithMissingFields.crossOverPits).toEqual(false)
            expect(movementWithMissingFields.passThroughWalls).toEqual(false)
        })
    })
})
