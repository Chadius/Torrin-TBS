import {
    getValidValueOrDefault,
    isValidValue,
} from "../../utils/objectValidityCheck"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import {
    ActionEffectTemplate,
    ActionEffectTemplateService,
} from "./actionEffectTemplate"
import { AttributeModifier } from "../../squaddie/attribute/attributeModifier"
import {
    TargetConstraints,
    TargetConstraintsService,
} from "../targetConstraints"
import {
    ActionResourceCost,
    ActionResourceCostService,
} from "../actionResourceCost"
import { GlossaryTerm } from "../../campaign/glossary/glossary"

export const ActionDecision = {
    TARGET_SQUADDIE: "TARGET_SQUADDIE",
    ACTOR_SELECTION: "ACTOR_SELECTION",
    ACTION_SELECTION: "ACTION_SELECTION",
} as const satisfies Record<string, string>

export type TActionDecision = EnumLike<typeof ActionDecision>

interface ActionTemplateUserInformation {
    userReadableDescription: string
    customGlossaryTerms: GlossaryTerm[]
}

export interface ActionTemplate {
    id: string
    name: string
    rank?: number
    resourceCost?: ActionResourceCost
    userInformation: ActionTemplateUserInformation
    actionEffectTemplates: ActionEffectTemplate[]
    buttonIconResourceKey: string
    targetConstraints: TargetConstraints
}

export const ActionTemplateService = {
    new: ({
        id,
        name,
        actionEffectTemplates,
        resourceCost,
        buttonIconResourceKey,
        rank,
        targetConstraints,
        userInformation,
    }: {
        id: string
        name: string
        actionEffectTemplates?: ActionEffectTemplate[]
        resourceCost?: ActionResourceCost
        buttonIconResourceKey?: string
        rank?: number
        targetConstraints?: TargetConstraints
        userInformation?: ActionTemplateUserInformation
    }): ActionTemplate => {
        return sanitize({
            id,
            name,
            actionEffectTemplates,
            resourceCost,
            rank: rank ?? 0,
            buttonIconResourceKey,
            targetConstraints:
                targetConstraints ?? TargetConstraintsService.new({}),
            userInformation: userInformation ?? {
                userReadableDescription: "Missing Description",
                customGlossaryTerms: [],
            },
        })
    },
    multipleAttackPenaltyMultiplier: (
        actionTemplate: ActionTemplate
    ): number => {
        const getMAPFromActionEffectTemplate = (
            accumulator: number,
            actionEffect: ActionEffectTemplate
        ): number => {
            if (
                TraitStatusStorageService.getStatus(
                    actionEffect.traits,
                    Trait.ATTACK
                ) !== true
            ) {
                return accumulator
            }

            const map = TraitStatusStorageService.getStatus(
                actionEffect.traits,
                Trait.NO_MULTIPLE_ATTACK_PENALTY
            )
                ? 0
                : 1
            return accumulator + map
        }

        return actionTemplate.actionEffectTemplates.reduce(
            getMAPFromActionEffectTemplate,
            0
        )
    },
    sanitize: (template: ActionTemplate): ActionTemplate => {
        return sanitize(template)
    },
    getTotalDamage: (actionTemplate: ActionTemplate): number => {
        return actionTemplate.actionEffectTemplates.reduce(
            (
                accumulator: number,
                actionEffectTemplate: ActionEffectTemplate
            ): number => {
                const damage = Object.values(
                    actionEffectTemplate.damageDescriptions
                ).reduce(
                    (
                        damageAccumulator: number,
                        currentDamage: number
                    ): number => {
                        return damageAccumulator + currentDamage
                    },
                    0
                )

                return accumulator + damage
            },
            0
        )
    },
    getTotalHealing: (actionTemplate: ActionTemplate): number => {
        return actionTemplate.actionEffectTemplates.reduce(
            (
                accumulator: number,
                actionEffectTemplate: ActionEffectTemplate
            ): number => {
                const healing = Object.values(
                    actionEffectTemplate.healingDescriptions
                ).reduce(
                    (
                        healingAccumulator: number,
                        currentDamage: number
                    ): number => {
                        return healingAccumulator + currentDamage
                    },
                    0
                )

                return accumulator + healing
            },
            0
        )
    },
    getActionTemplateRange: (actionTemplate: ActionTemplate): number[] => {
        return [
            actionTemplate.targetConstraints.minimumRange,
            actionTemplate.targetConstraints.maximumRange,
        ]
    },
    getActionTemplateDecisionTypes: (
        actionTemplate: ActionTemplate
    ): TActionDecision[] => {
        return actionTemplate.actionEffectTemplates
            .map((template) => template.actionDecisions)
            .flat()
    },
    getAttributeModifiers: (
        actionTemplate: ActionTemplate
    ): AttributeModifier[] => {
        return (
            actionTemplate.actionEffectTemplates
                .map(
                    (actionEffectTemplate: ActionEffectTemplate) =>
                        actionEffectTemplate
                )
                .filter(
                    (actionEffectSquaddieTemplate: ActionEffectTemplate) =>
                        actionEffectSquaddieTemplate.attributeModifiers
                            ?.length > 0
                )
                .map(
                    (actionEffectSquaddieTemplate: ActionEffectTemplate) =>
                        actionEffectSquaddieTemplate.attributeModifiers
                )
                .flat() || []
        )
    },
    getActionEffectTemplates: (
        actionTemplate: ActionTemplate
    ): ActionEffectTemplate[] => getActionEffectTemplates(actionTemplate),
    doesActionTemplateHeal: (actionTemplate: ActionTemplate): boolean =>
        doesActionTemplateHeal(actionTemplate),
    doesItTargetFoesFirst: (actionTemplate: ActionTemplate): boolean =>
        ActionEffectTemplateService.doesItTargetFoes(
            actionTemplate.actionEffectTemplates[0]
        ),
    doesItNotTargetFoesFirst: (actionTemplate: ActionTemplate): boolean =>
        !ActionEffectTemplateService.doesItTargetFoes(
            actionTemplate.actionEffectTemplates[0]
        ),
}

const sanitize = (template: ActionTemplate): ActionTemplate => {
    if (!isValidValue(template.id)) {
        throw new Error("ActionTemplate cannot sanitize, id required")
    }

    if (!isValidValue(template.name)) {
        throw new Error("ActionTemplate cannot sanitize, name required")
    }

    template.resourceCost = ActionResourceCostService.sanitize(
        template.resourceCost
    )

    template.actionEffectTemplates = getValidValueOrDefault(
        template.actionEffectTemplates,
        []
    )
    template.actionEffectTemplates.forEach((actionEffectTemplate) => {
        ActionEffectTemplateService.sanitize(actionEffectTemplate)
    })

    template.userInformation.customGlossaryTerms ||= []
    return template
}

const getActionEffectTemplates = (
    actionTemplate: ActionTemplate
): ActionEffectTemplate[] =>
    actionTemplate.actionEffectTemplates.map(
        (actionEffectTemplate) => actionEffectTemplate
    )

const doesActionTemplateHeal = (actionTemplate: ActionTemplate): boolean => {
    const actionEffectSquaddieTemplates =
        getActionEffectTemplates(actionTemplate)

    return actionEffectSquaddieTemplates.some(
        (actionEffectSquaddieTemplate) =>
            actionEffectSquaddieTemplate.healingDescriptions?.LOST_HIT_POINTS >
            0
    )
}
