import { SquaddieMovement, SquaddieMovementService } from "./movement"
import {
    getValidValueOrDefault,
    isValidValue,
} from "../utils/objectValidityCheck"
import { VersusSquaddieResistance } from "../action/template/actionEffectTemplate"

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
    armor: {
        proficiencyLevel: ProficiencyLevel
        base: number
    }
    versusProficiencyLevels: {
        [k in VersusSquaddieResistance]: ProficiencyLevel
    }
    movement: SquaddieMovement
    tier: number
}

export const ArmyAttributesService = {
    new: ({
        maxHitPoints,
        movement,
        tier,
        armor,
        versusProficiencyLevels,
    }: {
        maxHitPoints?: number
        movement?: SquaddieMovement
        tier?: number
        armor?: {
            proficiencyLevel: ProficiencyLevel
            base: number
        }
        versusProficiencyLevels?: {
            [k in VersusSquaddieResistance]?: ProficiencyLevel
        }
    }): ArmyAttributes => {
        const attributes = {
            ...DefaultArmyAttributes(),
            movement,
            maxHitPoints,
            armor,
            tier,
        }
        if (isValidValue(versusProficiencyLevels))
            Object.assign(
                attributes.versusProficiencyLevels,
                versusProficiencyLevels
            )
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
        armor: {
            proficiencyLevel: ProficiencyLevel.UNTRAINED,
            base: 0,
        },
        versusProficiencyLevels: {
            [VersusSquaddieResistance.ARMOR]: ProficiencyLevel.UNTRAINED,
            [VersusSquaddieResistance.BODY]: ProficiencyLevel.UNTRAINED,
            [VersusSquaddieResistance.MIND]: ProficiencyLevel.UNTRAINED,
            [VersusSquaddieResistance.SOUL]: ProficiencyLevel.UNTRAINED,
            [VersusSquaddieResistance.OTHER]: ProficiencyLevel.UNTRAINED,
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

    data.armor = getValidValueOrDefault(data.armor, defaultAttributes.armor)
    data.tier = getValidValueOrDefault(data.tier, defaultAttributes.tier)
    data.versusProficiencyLevels = {
        [VersusSquaddieResistance.ARMOR]: getValidValueOrDefault(
            data?.versusProficiencyLevels?.[VersusSquaddieResistance.ARMOR],
            ProficiencyLevel.UNTRAINED
        ),
        [VersusSquaddieResistance.BODY]: getValidValueOrDefault(
            data?.versusProficiencyLevels?.[VersusSquaddieResistance.BODY],
            ProficiencyLevel.UNTRAINED
        ),
        [VersusSquaddieResistance.MIND]: getValidValueOrDefault(
            data?.versusProficiencyLevels?.[VersusSquaddieResistance.MIND],
            ProficiencyLevel.UNTRAINED
        ),
        [VersusSquaddieResistance.SOUL]: getValidValueOrDefault(
            data?.versusProficiencyLevels?.[VersusSquaddieResistance.SOUL],
            ProficiencyLevel.UNTRAINED
        ),
        [VersusSquaddieResistance.OTHER]: getValidValueOrDefault(
            data?.versusProficiencyLevels?.[VersusSquaddieResistance.OTHER],
            ProficiencyLevel.UNTRAINED
        ),
    }
    return data
}
