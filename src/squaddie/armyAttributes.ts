import { SquaddieMovement, SquaddieMovementService } from "./movement"
import {
    getValidValueOrDefault,
    isValidValue,
} from "../utils/objectValidityCheck"
import {
    VersusSquaddieResistance,
    TVersusSquaddieResistance,
} from "../action/template/actionEffectTemplate"
import { EnumLike } from "../utils/enum"

export const ProficiencyLevel = {
    UNTRAINED: "UNTRAINED",
    NOVICE: "NOVICE",
    EXPERT: "EXPERT",
    MASTER: "MASTER",
    LEGENDARY: "LEGENDARY",
} as const satisfies Record<string, string>
export type TProficiencyLevel = EnumLike<typeof ProficiencyLevel>

export const BonusByProficiencyLevel: { [l in TProficiencyLevel]: number } = {
    [ProficiencyLevel.UNTRAINED]: 0,
    [ProficiencyLevel.NOVICE]: 1,
    [ProficiencyLevel.EXPERT]: 2,
    [ProficiencyLevel.MASTER]: 3,
    [ProficiencyLevel.LEGENDARY]: 4,
}

export interface ArmyAttributes {
    maxHitPoints: number
    armor: {
        proficiencyLevel: TProficiencyLevel
        base: number
    }
    versusProficiencyLevels: {
        [k in TVersusSquaddieResistance]: TProficiencyLevel
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
            proficiencyLevel: TProficiencyLevel
            base: number
        }
        versusProficiencyLevels?: {
            [k in TVersusSquaddieResistance]?: TProficiencyLevel
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

const sanitize = (data: Partial<ArmyAttributes>): ArmyAttributes => {
    const defaultAttributes = DefaultArmyAttributes()
    data.movement = getValidValueOrDefault(
        data.movement,
        defaultAttributes.movement
    )
    const movement = SquaddieMovementService.sanitize(
        data?.movement ?? defaultAttributes.movement
    )

    if (
        !isValidValue(data.maxHitPoints) ||
        data.maxHitPoints == undefined ||
        data.maxHitPoints <= 0
    ) {
        data.maxHitPoints = defaultAttributes.maxHitPoints
    }

    data.armor = data.armor ?? defaultAttributes.armor
    data.tier = data.tier ?? defaultAttributes.tier
    data.versusProficiencyLevels = {
        [VersusSquaddieResistance.ARMOR]:
            data?.versusProficiencyLevels?.[VersusSquaddieResistance.ARMOR] ??
            ProficiencyLevel.UNTRAINED,
        [VersusSquaddieResistance.BODY]:
            data?.versusProficiencyLevels?.[VersusSquaddieResistance.BODY] ??
            ProficiencyLevel.UNTRAINED,
        [VersusSquaddieResistance.MIND]:
            data?.versusProficiencyLevels?.[VersusSquaddieResistance.MIND] ??
            ProficiencyLevel.UNTRAINED,
        [VersusSquaddieResistance.SOUL]:
            data?.versusProficiencyLevels?.[VersusSquaddieResistance.SOUL] ??
            ProficiencyLevel.UNTRAINED,
        [VersusSquaddieResistance.OTHER]:
            data?.versusProficiencyLevels?.[VersusSquaddieResistance.OTHER] ??
            ProficiencyLevel.UNTRAINED,
    }
    return {
        maxHitPoints: data.maxHitPoints,
        armor: data.armor,
        versusProficiencyLevels: data.versusProficiencyLevels,
        movement,
        tier: data.tier,
    }
}
