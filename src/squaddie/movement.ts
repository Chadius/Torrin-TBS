import {Trait, TraitStatusStorage} from "../trait/traitStatusStorage";

export interface SquaddieMovement {
    movementPerAction: number;
    passThroughWalls: boolean;
    crossOverPits: boolean;
}

export const CreateNewSquaddieMovementWithTraits = ({movementPerAction, traits}: {
    movementPerAction?: number;
    traits?: TraitStatusStorage;
}): SquaddieMovement => {
    let newMovement: number = 2;
    if (movementPerAction || movementPerAction === 0) {
        newMovement = movementPerAction;
    }

    let passThroughWalls = false;
    let crossOverPits = false;

    if (traits) {
        passThroughWalls = traits.getStatus(Trait.PASS_THROUGH_WALLS);
        crossOverPits = traits.getStatus(Trait.CROSS_OVER_PITS);
    }

    return {
        movementPerAction: newMovement,
        crossOverPits,
        passThroughWalls,
    }
}
