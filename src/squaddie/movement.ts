import {Trait, TraitStatusStorage} from "../trait/traitStatusStorage";

export class SquaddieMovement {
    movementPerAction: number;
    passThroughWalls: boolean = false;
    crossOverPits: boolean = false;

    constructor(options?: {
        movementPerAction: number;
        traits: TraitStatusStorage;
    }) {
        if (!options) {
            options = {
                movementPerAction: 2,
                traits: new TraitStatusStorage({})
            };
        }

        this.movementPerAction = options.movementPerAction;
        this.passThroughWalls = options.traits.getStatus(Trait.PASS_THROUGH_WALLS);
        this.crossOverPits = options.traits.getStatus(Trait.CROSS_OVER_PITS);
    }
}
