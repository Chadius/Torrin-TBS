import {CreateNewSquaddieMovementWithTraits, SquaddieMovement} from "./movement";
import {Trait, TraitStatusStorage} from "../trait/traitStatusStorage";

describe('movement for squaddies', () => {
    it('can make movement from data', () => {
        const movement = new SquaddieMovement({
            movementPerAction: 3,
            passThroughWalls: true,
            crossOverPits: false,
        });

        expect(movement.movementPerAction).toBe(3);
        expect(movement.passThroughWalls).toBeTruthy();
        expect(movement.crossOverPits).toBeFalsy();
    });

    it('can make movement using traits and movement speed', () => {
        const movement = CreateNewSquaddieMovementWithTraits({
            movementPerAction: 3,
            traits: new TraitStatusStorage({
                initialTraitValues: {
                    [Trait.PASS_THROUGH_WALLS]: true,
                }
            })
        });

        expect(movement.movementPerAction).toBe(3);
        expect(movement.passThroughWalls).toBeTruthy();
        expect(movement.crossOverPits).toBeFalsy();
    });
});
