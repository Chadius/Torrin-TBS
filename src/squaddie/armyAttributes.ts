import { SquaddieMovement, SquaddieMovementService } from "./movement"
import { getValidValueOrDefault, isValidValue } from "../utils/validityCheck"

export enum ProficiencyLevel {
    UNTRAINED = "UNTRAINED",
    NOVICE = "NOVICE",
    EXPERT = "EXPERT",
    MASTER = "MASTER",
    LEGENDARY = "LEGENDARY",
}

export const BonusByProficiencyLevel: { [l in ProficiencyLevel]: number } = {
    [ProficiencyLevel.UNTRAINED]: 0,
    [ProficiencyLevel.NOVICE]: 1,
    [ProficiencyLevel.EXPERT]: 2,
    [ProficiencyLevel.MASTER]: 3,
    [ProficiencyLevel.LEGENDARY]: 4,
}

export interface ArmyAttributes {
    maxHitPoints: number
    armorClass: number
    armor: {
        proficiencyLevel: ProficiencyLevel
        base: number
    }
    movement: SquaddieMovement
    tier: number
}

export const ArmyAttributesService = {
    new: ({
        maxHitPoints,
        armorClass,
        movement,
        tier,
        armor,
    }: {
        maxHitPoints?: number
        armorClass?: number
        movement?: SquaddieMovement
        tier?: number
        armor?: {
            proficiencyLevel: ProficiencyLevel
            base: number
        }
    }): ArmyAttributes => {
        const attributes = {
            ...DefaultArmyAttributes(),
            movement,
            maxHitPoints,
            armorClass,
            armor,
            tier,
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
        armor: {
            proficiencyLevel: ProficiencyLevel.UNTRAINED,
            base: 0,
        },
        maxHitPoints: 5,
        tier: 0,
    }
}

const sanitize = (data: ArmyAttributes): ArmyAttributes => {
    const defaultAttributes = DefaultArmyAttributes()
    data.movement = getValidValueOrDefault(
        data.movement,
        defaultAttributes.movement
    )
    SquaddieMovementService.sanitize(data.movement)

    if (!isValidValue(data.maxHitPoints) || data.maxHitPoints <= 0) {
        data.maxHitPoints = defaultAttributes.maxHitPoints
    }
    if (!isValidValue(data.armorClass)) {
        data.armorClass = defaultAttributes.armorClass
    }

    data.armor = getValidValueOrDefault(data.armor, defaultAttributes.armor)
    data.tier = getValidValueOrDefault(data.tier, defaultAttributes.tier)
    return data
}
