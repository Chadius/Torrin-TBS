import { DamageType, HealingType } from "../../squaddie/squaddieService"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import { getValidValueOrDefault, isValidValue } from "../../utils/validityCheck"
import { AttributeModifier } from "../../squaddie/attributeModifier"
import { ActionDecisionType } from "./actionTemplate"

export interface ActionEffectTemplate {
    damageDescriptions: { [t in DamageType]?: number }
    healingDescriptions: { [t in HealingType]?: number }
    traits: {
        booleanTraits: { [key in Trait]?: boolean }
    }
    buttonIconResourceKey?: string
    attributeModifiers: AttributeModifier[]
    actionDecisions: ActionDecisionType[]
}

export const ActionEffectTemplateService = {
    new: ({
        damageDescriptions,
        healingDescriptions,
        traits,
        buttonIconResourceKey,
        attributeModifiers,
        actionDecisions,
    }: {
        traits?: {
            booleanTraits: { [key in Trait]?: boolean }
        }
        damageDescriptions?: { [t in DamageType]?: number }
        healingDescriptions?: { [t in HealingType]?: number }
        attributeModifiers?: AttributeModifier[]
        buttonIconResourceKey?: string
        actionDecisions?: ActionDecisionType[]
    }): ActionEffectTemplate => {
        const data: ActionEffectTemplate = {
            traits: traits,
            damageDescriptions: damageDescriptions,
            healingDescriptions: healingDescriptions,
            attributeModifiers: attributeModifiers || [],
            buttonIconResourceKey,
            actionDecisions: actionDecisions || [
                ActionDecisionType.TARGET_SQUADDIE,
            ],
        }

        sanitize(data)
        return data
    },
    sanitize: (data: ActionEffectTemplate): ActionEffectTemplate => {
        return sanitize(data)
    },
    doesItTargetFriends: (
        actionEffectSquaddieTemplate: ActionEffectTemplate
    ): boolean =>
        TraitStatusStorageService.getStatus(
            actionEffectSquaddieTemplate.traits,
            Trait.TARGET_ALLY
        ),
    doesItTargetSelf: (
        actionEffectSquaddieTemplate: ActionEffectTemplate
    ): boolean =>
        TraitStatusStorageService.getStatus(
            actionEffectSquaddieTemplate.traits,
            Trait.TARGET_SELF
        ),
    doesItTargetFoes: (
        actionEffectSquaddieTemplate: ActionEffectTemplate
    ): boolean =>
        TraitStatusStorageService.getStatus(
            actionEffectSquaddieTemplate.traits,
            Trait.TARGET_FOE
        ),
    getMultipleAttackPenalty: (template: ActionEffectTemplate): number => {
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

const sanitize = (data: ActionEffectTemplate): ActionEffectTemplate => {
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
    data.actionDecisions = getValidValueOrDefault(data.actionDecisions, [])
    TraitStatusStorageService.sanitize(data.traits)
    return data
}
