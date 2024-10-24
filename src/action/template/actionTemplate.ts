import { ActionEffectTemplate, ActionEffectType } from "./actionEffectTemplate"
import { getValidValueOrDefault, isValidValue } from "../../utils/validityCheck"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import {
    ActionEffectSquaddieTemplate,
    ActionEffectSquaddieTemplateService,
} from "./actionEffectSquaddieTemplate"
import { AttributeModifier } from "../../squaddie/attributeModifier"

export enum ActionDecisionType {
    TARGET_SQUADDIE = "TARGET_SQUADDIE",
    ACTOR_SELECTION = "ACTOR_SELECTION",
    ACTION_SELECTION = "ACTION_SELECTION",
    LOCATION_SELECTION = "LOCATION_SELECTION",
}

export interface ActionTemplate {
    id: string
    name: string
    actionPoints: number
    actionEffectTemplates: ActionEffectTemplate[]
    buttonIconResourceKey: string
}

export const ActionTemplateService = {
    new: ({
        id,
        name,
        actionEffectTemplates,
        actionPoints,
        buttonIconResourceKey,
    }: {
        id: string
        name: string
        actionEffectTemplates?: ActionEffectTemplate[]
        actionPoints?: number
        buttonIconResourceKey?: string
    }): ActionTemplate => {
        return sanitize({
            id,
            name,
            actionEffectTemplates,
            actionPoints,
            buttonIconResourceKey,
        })
    },
    multipleAttackPenaltyMultiplier: (
        actionTemplate: ActionTemplate
    ): number => {
        const getMAPFromActionEffectTemplate = (
            accumulator: number,
            actionEffect: ActionEffectTemplate
        ): number => {
            if (actionEffect.type !== ActionEffectType.SQUADDIE) {
                return accumulator
            }

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
                if (actionEffectTemplate.type !== ActionEffectType.SQUADDIE) {
                    return accumulator
                }

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
                if (actionEffectTemplate.type !== ActionEffectType.SQUADDIE) {
                    return accumulator
                }

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
        const actionEffectTemplatesWithRange =
            actionTemplate.actionEffectTemplates.filter(
                (actionEffectTemplate) =>
                    actionEffectTemplate.type === ActionEffectType.SQUADDIE
            )

        if (actionEffectTemplatesWithRange.length === 0) {
            return undefined
        }

        const minimumRanges = actionEffectTemplatesWithRange.map(
            (actionEffectSquaddieTemplate) =>
                (actionEffectSquaddieTemplate as ActionEffectSquaddieTemplate)
                    .minimumRange
        )
        const maximumRanges = actionEffectTemplatesWithRange.map(
            (actionEffectSquaddieTemplate) =>
                (actionEffectSquaddieTemplate as ActionEffectSquaddieTemplate)
                    .maximumRange
        )

        return [Math.min(...minimumRanges), Math.max(...maximumRanges)]
    },
    getActionTemplateDecisionTypes: (
        actionTemplate: ActionTemplate
    ): ActionDecisionType[] => {
        return actionTemplate.actionEffectTemplates
            .map((template) => template.actionDecisions)
            .flat()
    },
    getAttributeModifiers: (
        actionTemplate: ActionTemplate
    ): AttributeModifier[] => {
        return (
            actionTemplate.actionEffectTemplates
                .filter(
                    (actionEffectTemplate: ActionEffectTemplate) =>
                        actionEffectTemplate.type === ActionEffectType.SQUADDIE
                )
                .map(
                    (actionEffectTemplate: ActionEffectTemplate) =>
                        actionEffectTemplate as ActionEffectSquaddieTemplate
                )
                .filter(
                    (
                        actionEffectSquaddieTemplate: ActionEffectSquaddieTemplate
                    ) =>
                        actionEffectSquaddieTemplate.attributeModifiers
                            ?.length > 0
                )
                .map(
                    (
                        actionEffectSquaddieTemplate: ActionEffectSquaddieTemplate
                    ) => actionEffectSquaddieTemplate.attributeModifiers
                )
                .flat() || []
        )
    },
    getActionEffectSquaddieTemplates: (
        actionTemplate: ActionTemplate
    ): ActionEffectSquaddieTemplate[] =>
        getActionEffectSquaddieTemplates(actionTemplate),
    doesActionTemplateHeal: (actionTemplate: ActionTemplate): boolean =>
        doesActionTemplateHeal(actionTemplate),
}

const sanitize = (template: ActionTemplate): ActionTemplate => {
    if (!isValidValue(template.id)) {
        throw new Error("ActionTemplate cannot sanitize, id required")
    }

    if (!isValidValue(template.name)) {
        throw new Error("ActionTemplate cannot sanitize, name required")
    }

    template.actionPoints = getValidValueOrDefault(template.actionPoints, 1)
    template.actionEffectTemplates = getValidValueOrDefault(
        template.actionEffectTemplates,
        []
    )
    template.actionEffectTemplates.forEach((actionEffectTemplate, index) => {
        switch (actionEffectTemplate.type) {
            case ActionEffectType.SQUADDIE:
                ActionEffectSquaddieTemplateService.sanitize(
                    actionEffectTemplate
                )
                break
            case ActionEffectType.MOVEMENT:
                break
            case ActionEffectType.END_TURN:
                break
            default:
                throw new Error(
                    `ActionTemplate ${template.id} cannot sanitize, actionEffectTemplate ${index} is missing type`
                )
        }
    })
    return template
}

const getActionEffectSquaddieTemplates = (
    actionTemplate: ActionTemplate
): ActionEffectSquaddieTemplate[] =>
    actionTemplate.actionEffectTemplates
        .filter(
            (actionEffectTemplate) =>
                actionEffectTemplate.type === ActionEffectType.SQUADDIE
        )
        .map(
            (actionEffectTemplate) =>
                actionEffectTemplate as ActionEffectSquaddieTemplate
        )

const doesActionTemplateHeal = (actionTemplate: ActionTemplate): boolean => {
    const actionEffectSquaddieTemplates =
        getActionEffectSquaddieTemplates(actionTemplate)

    return actionEffectSquaddieTemplates.some(
        (actionEffectSquaddieTemplate) =>
            actionEffectSquaddieTemplate.healingDescriptions?.LOST_HIT_POINTS >
            0
    )
}
