import { ActionEffectType } from "./actionEffectTemplate"
import { DamageType, HealingType } from "../../squaddie/squaddieService"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import { TargetingShape } from "../../battle/targeting/targetingShapeGenerator"
import { ActionRange } from "../../squaddie/actionRange"
import { assertsInteger } from "../../utils/mathAssert"
import { getValidValueOrDefault, isValidValue } from "../../utils/validityCheck"

export interface ActionEffectSquaddieTemplate {
    type: ActionEffectType.SQUADDIE
    damageDescriptions: { [t in DamageType]?: number }
    healingDescriptions: { [t in HealingType]?: number }
    traits: {
        booleanTraits: { [key in Trait]?: boolean }
    }
    minimumRange: number
    maximumRange: number
    targetingShape: TargetingShape
    buttonIconResourceKey?: string
}

export const ActionEffectSquaddieTemplateService = {
    new: ({
        damageDescriptions,
        healingDescriptions,
        maximumRange,
        minimumRange,
        traits,
        targetingShape,
        buttonIconResourceKey,
    }: {
        traits?: {
            booleanTraits: { [key in Trait]?: boolean }
        }
        damageDescriptions?: { [t in DamageType]?: number }
        healingDescriptions?: { [t in HealingType]?: number }
        targetingShape?: TargetingShape
        buttonIconResourceKey?: string
    } & Partial<ActionRange>): ActionEffectSquaddieTemplate => {
        const data: ActionEffectSquaddieTemplate = {
            type: ActionEffectType.SQUADDIE,
            minimumRange: minimumRange ? minimumRange : 0,
            maximumRange: maximumRange ? maximumRange : 0,
            traits: traits,
            damageDescriptions: damageDescriptions,
            healingDescriptions: healingDescriptions,
            targetingShape: targetingShape,
            buttonIconResourceKey,
        }

        sanitize(data)
        return data
    },
    sanitize: (
        data: ActionEffectSquaddieTemplate
    ): ActionEffectSquaddieTemplate => {
        return sanitize(data)
    },
    isHelpful: (data: ActionEffectSquaddieTemplate): boolean => {
        return TraitStatusStorageService.getStatus(data.traits, Trait.HEALING)
    },
    isHindering: (data: ActionEffectSquaddieTemplate): boolean => {
        return TraitStatusStorageService.getStatus(data.traits, Trait.ATTACK)
    },
    getMultipleAttackPenalty: (
        template: ActionEffectSquaddieTemplate
    ): number => {
        if (
            TraitStatusStorageService.getStatus(
                template.traits,
                Trait.ATTACK
            ) !== true
        ) {
            return 0
        }

        return TraitStatusStorageService.getStatus(
            template.traits,
            Trait.NO_MULTIPLE_ATTACK_PENALTY
        )
            ? 0
            : 1
    },
}

const sanitize = (
    data: ActionEffectSquaddieTemplate
): ActionEffectSquaddieTemplate => {
    if (isValidValue(data.minimumRange)) {
        assertsInteger(data.minimumRange)
    } else {
        data.minimumRange = 0
    }

    if (isValidValue(data.maximumRange)) {
        assertsInteger(data.maximumRange)
    } else {
        data.minimumRange = 0
    }
    if (data.minimumRange > data.maximumRange) {
        throw new Error(
            `SquaddieAction cannot sanitize, minimumRange is more than maximumRange: ${data.minimumRange} ${data.maximumRange}`
        )
    }

    data.targetingShape =
        isValidValue(data.targetingShape) &&
        data.targetingShape !== TargetingShape.UNKNOWN
            ? data.targetingShape
            : TargetingShape.SNAKE
    data.traits = getValidValueOrDefault(
        data.traits,
        TraitStatusStorageService.newUsingTraitValues({})
    )
    data.damageDescriptions = isValidValue(data.damageDescriptions)
        ? { ...data.damageDescriptions }
        : {}
    data.healingDescriptions = isValidValue(data.healingDescriptions)
        ? { ...data.healingDescriptions }
        : {}
    return data
}
