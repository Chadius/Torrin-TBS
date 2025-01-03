import { DamageType, HealingType } from "../../squaddie/squaddieService"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import { getValidValueOrDefault, isValidValue } from "../../utils/validityCheck"
import { AttributeModifier } from "../../squaddie/attribute/attributeModifier"
import { ActionDecisionType } from "./actionTemplate"

export enum TargetBySquaddieAffiliationRelation {
    TARGET_SELF = "TARGET_SELF",
    TARGET_FOE = "TARGET_FOE",
    TARGET_ALLY = "TARGET_ALLY",
}

export enum VersusSquaddieResistance {
    UNKNOWN = "UNKNOWN",
    ARMOR = "ARMOR",
    BODY = "BODY",
    MIND = "MIND",
    SOUL = "SOUL",
}

export interface ActionEffectTemplate {
    damageDescriptions: { [t in DamageType]?: number }
    healingDescriptions: { [t in HealingType]?: number }
    traits: {
        booleanTraits: { [key in Trait]?: boolean }
    }
    buttonIconResourceKey?: string
    attributeModifiers: AttributeModifier[]
    actionDecisions: ActionDecisionType[]
    targetConstraints: {
        squaddieAffiliationRelation: {
            [TargetBySquaddieAffiliationRelation.TARGET_SELF]: boolean
            [TargetBySquaddieAffiliationRelation.TARGET_ALLY]: boolean
            [TargetBySquaddieAffiliationRelation.TARGET_FOE]: boolean
        }
        versusSquaddieResistance: VersusSquaddieResistance
    }
}

export const ActionEffectTemplateService = {
    new: ({
        damageDescriptions,
        healingDescriptions,
        traits,
        buttonIconResourceKey,
        attributeModifiers,
        actionDecisions,
        squaddieAffiliationRelation,
        versusSquaddieResistance,
    }: {
        traits?: {
            booleanTraits: { [key in Trait]?: boolean }
        }
        damageDescriptions?: { [t in DamageType]?: number }
        healingDescriptions?: { [t in HealingType]?: number }
        attributeModifiers?: AttributeModifier[]
        buttonIconResourceKey?: string
        actionDecisions?: ActionDecisionType[]
        squaddieAffiliationRelation?: {
            [TargetBySquaddieAffiliationRelation.TARGET_SELF]?: boolean
            [TargetBySquaddieAffiliationRelation.TARGET_ALLY]?: boolean
            [TargetBySquaddieAffiliationRelation.TARGET_FOE]?: boolean
        }
        versusSquaddieResistance?: VersusSquaddieResistance
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
            targetConstraints: {
                versusSquaddieResistance:
                    versusSquaddieResistance ??
                    VersusSquaddieResistance.UNKNOWN,
                squaddieAffiliationRelation: {
                    [TargetBySquaddieAffiliationRelation.TARGET_SELF]:
                        squaddieAffiliationRelation
                            ? squaddieAffiliationRelation[
                                  TargetBySquaddieAffiliationRelation
                                      .TARGET_SELF
                              ]
                            : false,
                    [TargetBySquaddieAffiliationRelation.TARGET_ALLY]:
                        squaddieAffiliationRelation
                            ? squaddieAffiliationRelation[
                                  TargetBySquaddieAffiliationRelation
                                      .TARGET_ALLY
                              ]
                            : false,
                    [TargetBySquaddieAffiliationRelation.TARGET_FOE]:
                        squaddieAffiliationRelation
                            ? squaddieAffiliationRelation[
                                  TargetBySquaddieAffiliationRelation.TARGET_FOE
                              ]
                            : false,
                },
            },
        }

        sanitize(data)
        return data
    },
    sanitize: (data: ActionEffectTemplate): ActionEffectTemplate => {
        return sanitize(data)
    },
    doesItTargetFriends: (
        actionEffectTemplate: ActionEffectTemplate
    ): boolean =>
        actionEffectTemplate.targetConstraints.squaddieAffiliationRelation[
            TargetBySquaddieAffiliationRelation.TARGET_ALLY
        ],
    doesItTargetSelf: (actionEffectTemplate: ActionEffectTemplate): boolean =>
        actionEffectTemplate.targetConstraints.squaddieAffiliationRelation[
            TargetBySquaddieAffiliationRelation.TARGET_SELF
        ],
    doesItTargetFoes: (actionEffectTemplate: ActionEffectTemplate): boolean =>
        actionEffectTemplate.targetConstraints.squaddieAffiliationRelation[
            TargetBySquaddieAffiliationRelation.TARGET_FOE
        ],
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
