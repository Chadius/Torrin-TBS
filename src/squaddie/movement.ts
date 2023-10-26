import {Trait, TraitStatusStorage} from "../trait/traitStatusStorage";

export interface SquaddieMovementData {
    movementPerAction: number;
    passThroughWalls: boolean;
    crossOverPits: boolean;
}

export class SquaddieMovement implements SquaddieMovementData {
    movementPerAction: number;
    passThroughWalls: boolean = false;
    crossOverPits: boolean = false;

    constructor({
                    movementPerAction,
                    passThroughWalls,
                    crossOverPits,
                }: {
        movementPerAction: number;
        passThroughWalls: boolean;
        crossOverPits: boolean;
    }) {
        this.movementPerAction = movementPerAction;
        this.passThroughWalls = passThroughWalls;
        this.crossOverPits = crossOverPits;
    }
}

export const CreateNewSquaddieMovementWithTraits = ({movementPerAction, traits}: {
    movementPerAction?: number;
    traits?: TraitStatusStorage;
}) => {
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

    return new SquaddieMovement({
        movementPerAction: newMovement,
        crossOverPits,
        passThroughWalls,
    })
}
