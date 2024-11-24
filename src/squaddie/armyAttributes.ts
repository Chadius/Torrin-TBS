import { SquaddieMovement, SquaddieMovementService } from "./movement"
import { isValidValue } from "../utils/validityCheck"

export interface ArmyAttributes {
    maxHitPoints: number
    armorClass: number
    movement: SquaddieMovement
    tier: number
}

export const ArmyAttributesService = {
    new: ({
        maxHitPoints,
        armorClass,
        movement,
        tier,
    }: {
        maxHitPoints?: number
        armorClass?: number
        movement?: SquaddieMovement
        tier?: number
    }): ArmyAttributes => {
        const attributes = {
            ...DefaultArmyAttributes(),
            movement,
            maxHitPoints,
            armorClass,
        }
        return sanitize(attributes)
    },
    default: (): ArmyAttributes => {
        return DefaultArmyAttributes()
    },
    sanitize: (data: ArmyAttributes): ArmyAttributes => {
        return sanitize(data)
    },
}

export const DefaultArmyAttributes = (): ArmyAttributes => {
    return {
        movement: SquaddieMovementService.new({ movementPerAction: 2 }),
        armorClass: 0,
        maxHitPoints: 5,
        tier: 0,
    }
}

const sanitize = (data: ArmyAttributes): ArmyAttributes => {
    const defaultAttributes = DefaultArmyAttributes()
    if (!isValidValue(data.movement)) {
        data.movement = defaultAttributes.movement
    }
    SquaddieMovementService.sanitize(data.movement)

    if (!isValidValue(data.maxHitPoints) || data.maxHitPoints <= 0) {
        data.maxHitPoints = defaultAttributes.maxHitPoints
    }
    if (!isValidValue(data.armorClass)) {
        data.armorClass = defaultAttributes.armorClass
    }
    if (!isValidValue(data.tier)) {
        data.tier = defaultAttributes.tier
    }
    return data
}
