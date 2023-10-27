import {CreateNewSquaddieMovementWithTraits, SquaddieMovement} from "./movement";

export interface ArmyAttributes {
    maxHitPoints: number;
    armorClass: number;
    movement: SquaddieMovement;
}

export const DefaultArmyAttributes = (): ArmyAttributes => {
    return {
        movement: CreateNewSquaddieMovementWithTraits({movementPerAction: 2}),
        armorClass: 0,
        maxHitPoints: 5,
    }
}
