import { TDamage, THealing } from "../../squaddie/squaddieService"
import {
    Trait,
    TraitStatusStorageService,
    TTrait,
} from "../../trait/traitStatusStorage"
import {
    getValidValueOrDefault,
    isValidValue,
} from "../../utils/objectValidityCheck"
import { AttributeModifier } from "../../squaddie/attribute/attributeModifier"
import { ActionDecision, TActionDecision } from "./actionTemplate"
import { EnumLike } from "../../utils/enum"

export const TargetBySquaddieAffiliationRelation = {
    TARGET_SELF: "TARGET_SELF",
    TARGET_FOE: "TARGET_FOE",
    TARGET_ALLY: "TARGET_ALLY",
} as const satisfies Record<string, string>
export type TTargetBySquaddieAffiliationRelation = EnumLike<
    typeof TargetBySquaddieAffiliationRelation
>

export const VersusSquaddieResistance = {
    OTHER: "OTHER",
    ARMOR: "ARMOR",
    BODY: "BODY",
    MIND: "MIND",
    SOUL: "SOUL",
} as const satisfies Record<string, string>
export type TVersusSquaddieResistance = EnumLike<
    typeof VersusSquaddieResistance
>

export interface ActionEffectTemplate {
    damageDescriptions: { [t in TDamage]?: number }
    healingDescriptions: { [t in THealing]?: number }
    traits: {
        booleanTraits: { [key in TTrait]?: boolean }
    }
    buttonIconResourceKey?: string
    attributeModifiers: AttributeModifier[]
    actionDecisions: TActionDecision[]
    targetConstraints: {
        squaddieAffiliationRelation: {
            [TargetBySquaddieAffiliationRelation.TARGET_SELF]: boolean
            [TargetBySquaddieAffiliationRelation.TARGET_ALLY]: boolean
            [TargetBySquaddieAffiliationRelation.TARGET_FOE]: boolean
        }
        versusSquaddieResistance: TVersusSquaddieResistance
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
            booleanTraits: { [key in TTrait]?: boolean }
        }
        damageDescriptions?: { [t in TDamage]?: number }
        healingDescriptions?: { [t in THealing]?: number }
        attributeModifiers?: AttributeModifier[]
        buttonIconResourceKey?: string
        actionDecisions?: TActionDecision[]
        squaddieAffiliationRelation?: {
            [TargetBySquaddieAffiliationRelation.TARGET_SELF]?: boolean
            [TargetBySquaddieAffiliationRelation.TARGET_ALLY]?: boolean
            [TargetBySquaddieAffiliationRelation.TARGET_FOE]?: boolean
        }
        versusSquaddieResistance?: TVersusSquaddieResistance
    }): ActionEffectTemplate => {
        const data: ActionEffectTemplate = {
            traits: traits ?? { booleanTraits: {} },
            damageDescriptions: damageDescriptions ?? {},
            healingDescriptions: healingDescriptions ?? {},
            attributeModifiers: attributeModifiers || [],
            buttonIconResourceKey: buttonIconResourceKey ?? "",
            actionDecisions: actionDecisions || [
                ActionDecision.TARGET_SQUADDIE,
            ],
            targetConstraints: {
                versusSquaddieResistance:
                    versusSquaddieResistance ?? VersusSquaddieResistance.OTHER,
                squaddieAffiliationRelation: {
                    [TargetBySquaddieAffiliationRelation.TARGET_SELF]:
                        squaddieAffiliationRelation
                            ? (squaddieAffiliationRelation[
                                  TargetBySquaddieAffiliationRelation
                                      .TARGET_SELF
                              ] ?? false)
                            : false,
                    [TargetBySquaddieAffiliationRelation.TARGET_ALLY]:
                        squaddieAffiliationRelation
                            ? (squaddieAffiliationRelation[
                                  TargetBySquaddieAffiliationRelation
                                      .TARGET_ALLY
                              ] ?? false)
                            : false,
                    [TargetBySquaddieAffiliationRelation.TARGET_FOE]:
                        squaddieAffiliationRelation
                            ? (squaddieAffiliationRelation[
                                  TargetBySquaddieAffiliationRelation.TARGET_FOE
                              ] ?? false)
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
    doesItOnlyTargetSelf: (
        actionEffectTemplate: ActionEffectTemplate
    ): boolean =>
        actionEffectTemplate.targetConstraints.squaddieAffiliationRelation[
            TargetBySquaddieAffiliationRelation.TARGET_SELF
        ] &&
        !actionEffectTemplate.targetConstraints.squaddieAffiliationRelation[
            TargetBySquaddieAffiliationRelation.TARGET_ALLY
        ] &&
        !actionEffectTemplate.targetConstraints.squaddieAffiliationRelation[
            TargetBySquaddieAffiliationRelation.TARGET_FOE
        ],
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
            !TraitStatusStorageService.getStatus(template.traits, Trait.ATTACK)
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
    data.targetConstraints = getValidValueOrDefault(data.targetConstraints, {
        versusSquaddieResistance: VersusSquaddieResistance.OTHER,
        squaddieAffiliationRelation: {
            [TargetBySquaddieAffiliationRelation.TARGET_SELF]: false,
            [TargetBySquaddieAffiliationRelation.TARGET_ALLY]: false,
            [TargetBySquaddieAffiliationRelation.TARGET_FOE]: false,
        },
    })
    data.targetConstraints.versusSquaddieResistance = getValidValueOrDefault(
        data.targetConstraints.versusSquaddieResistance,
        VersusSquaddieResistance.OTHER
    )
    data.targetConstraints.squaddieAffiliationRelation = {
        [TargetBySquaddieAffiliationRelation.TARGET_SELF]:
            getValidValueOrDefault(
                data.targetConstraints.squaddieAffiliationRelation[
                    TargetBySquaddieAffiliationRelation.TARGET_SELF
                ],
                false
            ),
        [TargetBySquaddieAffiliationRelation.TARGET_ALLY]:
            getValidValueOrDefault(
                data.targetConstraints.squaddieAffiliationRelation[
                    TargetBySquaddieAffiliationRelation.TARGET_ALLY
                ],
                false
            ),
        [TargetBySquaddieAffiliationRelation.TARGET_FOE]:
            getValidValueOrDefault(
                data.targetConstraints.squaddieAffiliationRelation[
                    TargetBySquaddieAffiliationRelation.TARGET_FOE
                ],
                false
            ),
    }

    return data
}
