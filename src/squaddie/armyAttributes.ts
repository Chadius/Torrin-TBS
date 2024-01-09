import {CreateNewSquaddieMovementWithTraits, SquaddieMovement, SquaddieMovementHelper} from "./movement";
import {isValidValue} from "../utils/validityCheck";

export interface ArmyAttributes {
    maxHitPoints: number;
    armorClass: number;
    movement: SquaddieMovement;
}

export const ArmyAttributesService = {
    new: ({movement}: { movement?: SquaddieMovement }): ArmyAttributes => {
        const attributes = {
            ...DefaultArmyAttributes(),
            movement
        }
        return sanitize(attributes);

    },
    default: (): ArmyAttributes => {
        return DefaultArmyAttributes();
    },
    sanitize: (data: ArmyAttributes): ArmyAttributes => {
        return sanitize(data);
    }
}

export const DefaultArmyAttributes = (): ArmyAttributes => {
    return {
        movement: CreateNewSquaddieMovementWithTraits({movementPerAction: 2}),
        armorClass: 0,
        maxHitPoints: 5,
    }
}

const sanitize = (data: ArmyAttributes): ArmyAttributes => {
    const defaultAttributes = DefaultArmyAttributes();
    if (!isValidValue(data.movement)) {
        data.movement = defaultAttributes.movement;
    }
    SquaddieMovementHelper.sanitize(data.movement);

    if (!isValidValue(data.maxHitPoints) || data.maxHitPoints <= 0) {
        data.maxHitPoints = defaultAttributes.maxHitPoints;
    }
    if (!isValidValue(data.armorClass)) {
        data.armorClass = defaultAttributes.armorClass;
    }
    return data;
}
