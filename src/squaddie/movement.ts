import {Trait, TraitStatusStorage, TraitStatusStorageHelper} from "../trait/traitStatusStorage";
import {isValidValue} from "../utils/validityCheck";

export interface SquaddieMovement {
    movementPerAction: number;
    passThroughWalls: boolean;
    crossOverPits: boolean;
}

export const SquaddieMovementHelper = {
    new: ({movementPerAction, traits}: {
        movementPerAction?: number;
        traits?: TraitStatusStorage;
    }): SquaddieMovement => {
        return CreateNewSquaddieMovementWithTraits({movementPerAction, traits});
    },
    sanitize: (data: SquaddieMovement) => {
        sanitize(data);
    }
};


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
        passThroughWalls = TraitStatusStorageHelper.getStatus(traits, Trait.PASS_THROUGH_WALLS);
        crossOverPits = TraitStatusStorageHelper.getStatus(traits, Trait.CROSS_OVER_PITS);
    }

    return {
        movementPerAction: newMovement,
        crossOverPits,
        passThroughWalls,
    }
}

const sanitize = (data: SquaddieMovement) => {
    data.movementPerAction = isValidValue(data.movementPerAction) ? data.movementPerAction : 0;
    data.passThroughWalls = data.passThroughWalls === false || isValidValue(data.passThroughWalls) ? data.passThroughWalls : false;
    data.crossOverPits = data.crossOverPits === false || isValidValue(data.crossOverPits) ? data.crossOverPits : false;
}
