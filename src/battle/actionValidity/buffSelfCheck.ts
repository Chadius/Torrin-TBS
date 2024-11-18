import { BattleSquaddie } from "../battleSquaddie"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { ActionCheckResult } from "./actionPointCheck"
import { ActionEffectTemplate } from "../../action/template/actionEffectTemplate"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../action/template/actionTemplate"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import {
    AttributeModifier,
    AttributeTypeAndAmount,
} from "../../squaddie/attributeModifier"
import { InBattleAttributesService } from "../stats/inBattleAttributes"
import { CalculatorMiscellaneous } from "../calculator/actionCalculator/miscellaneous"
import { DegreeOfSuccess } from "../calculator/actionCalculator/degreeOfSuccess"
import { BattleActionActionContextService } from "../history/battleAction/battleActionActionContext"
import { CalculatedEffect } from "../calculator/actionCalculator/calculator"
import { ActionPerformFailureReason } from "../../squaddie/turn"

export const BuffSelfCheck = {
    willBuffUser: ({
        battleSquaddie,
        actionTemplateId,
        objectRepository,
        squaddieTemplate,
    }: {
        battleSquaddie: BattleSquaddie
        actionTemplateId: string
        objectRepository: ObjectRepository
        squaddieTemplate: SquaddieTemplate
    }): ActionCheckResult => {
        const validResponse: ActionCheckResult = {
            isValid: true,
        }

        const actionTemplate = ObjectRepositoryService.getActionTemplateById(
            objectRepository,
            actionTemplateId
        )

        if (!doesActionTemplateOnlyAffectSelf(actionTemplate)) {
            return validResponse
        }

        if (
            estimatedHealingOnTarget({
                actionTemplate,
                squaddieTemplate,
                battleSquaddie,
            }) > 0
        ) {
            return validResponse
        }

        let message = `Will have no effect on ${squaddieTemplate.squaddieId.name}`
        if (ActionTemplateService.doesActionTemplateHeal(actionTemplate)) {
            message = `${squaddieTemplate.squaddieId.name} is already at full health`
        }

        if (
            willAddModifiersToTarget({
                actionTemplate,
                squaddieTemplate,
                battleSquaddie,
            })
        ) {
            return validResponse
        }

        return {
            isValid: false,
            reason: ActionPerformFailureReason.BUFF_HAS_NO_EFFECT,
            message,
        }
    },
}

const doesActionTemplateOnlyAffectSelf = (
    actionTemplate: ActionTemplate
): boolean => {
    if (!actionTemplate) {
        return false
    }

    const actionEffectSquaddieTemplates =
        ActionTemplateService.getActionEffectTemplates(actionTemplate)

    if (actionEffectSquaddieTemplates.length === 0) {
        return false
    }

    const targetsOthers = (
        actionEffectSquaddieTemplate: ActionEffectTemplate
    ): boolean =>
        TraitStatusStorageService.getStatus(
            actionEffectSquaddieTemplate.traits,
            Trait.TARGET_FOE
        ) ||
        TraitStatusStorageService.getStatus(
            actionEffectSquaddieTemplate.traits,
            Trait.TARGET_ALLY
        )

    const targetsSelf = (
        actionEffectSquaddieTemplate: ActionEffectTemplate
    ): boolean =>
        TraitStatusStorageService.getStatus(
            actionEffectSquaddieTemplate.traits,
            Trait.TARGET_SELF
        )

    const onlyTargetsSelf = (
        actionEffectSquaddieTemplate: ActionEffectTemplate
    ): boolean =>
        !targetsOthers(actionEffectSquaddieTemplate) &&
        targetsSelf(actionEffectSquaddieTemplate)

    return actionEffectSquaddieTemplates.every(onlyTargetsSelf)
}

const estimatedHealingOnTarget = ({
    actionTemplate,
    battleSquaddie,
    squaddieTemplate,
}: {
    actionTemplate: ActionTemplate
    battleSquaddie: BattleSquaddie
    squaddieTemplate: SquaddieTemplate
}): number => {
    const actionEffectSquaddieTemplates =
        ActionTemplateService.getActionEffectTemplates(actionTemplate)

    const calculatedEffects: CalculatedEffect[] =
        actionEffectSquaddieTemplates.map((actionEffectSquaddieTemplate) => {
            return CalculatorMiscellaneous.calculateEffectBasedOnDegreeOfSuccess(
                {
                    actionEffectSquaddieTemplate,
                    actionContext: BattleActionActionContextService.new({
                        actingSquaddieModifiers: [],
                        targetSquaddieModifiers: {},
                    }),
                    degreeOfSuccess: DegreeOfSuccess.SUCCESS,
                    targetedSquaddieTemplate: squaddieTemplate,
                    targetedBattleSquaddie: battleSquaddie,
                }
            )
        })

    return calculatedEffects.reduce((sum, calculatedEffect) => {
        return sum + calculatedEffect.healingReceived
    }, 0)
}

const willAddModifiersToTarget = ({
    actionTemplate,
    battleSquaddie,
    squaddieTemplate,
}: {
    actionTemplate: ActionTemplate
    battleSquaddie: BattleSquaddie
    squaddieTemplate: SquaddieTemplate
}): boolean => {
    const actionEffectSquaddieTemplates =
        ActionTemplateService.getActionEffectTemplates(actionTemplate)

    const calculatedEffects: CalculatedEffect[] =
        actionEffectSquaddieTemplates.map((actionEffectSquaddieTemplate) => {
            return CalculatorMiscellaneous.calculateEffectBasedOnDegreeOfSuccess(
                {
                    actionEffectSquaddieTemplate,
                    actionContext: BattleActionActionContextService.new({
                        actingSquaddieModifiers: [],
                        targetSquaddieModifiers: {},
                    }),
                    degreeOfSuccess: DegreeOfSuccess.SUCCESS,
                    targetedSquaddieTemplate: squaddieTemplate,
                    targetedBattleSquaddie: battleSquaddie,
                }
            )
        })

    const attributeModifiersToAddToTarget: AttributeModifier[] =
        calculatedEffects
            .map(
                (calculatedEffect) =>
                    calculatedEffect.attributeModifiersToAddToTarget
            )
            .flat()

    const before = InBattleAttributesService.clone(
        battleSquaddie.inBattleAttributes
    )

    const after = InBattleAttributesService.clone(
        battleSquaddie.inBattleAttributes
    )
    attributeModifiersToAddToTarget.forEach((modifier) =>
        InBattleAttributesService.addActiveAttributeModifier(after, modifier)
    )

    const attributeModifierDifferences: AttributeTypeAndAmount[] =
        InBattleAttributesService.calculateAttributeModifiersGainedAfterChanges(
            before,
            after
        )

    return attributeModifierDifferences.some(
        (difference) => difference.amount > 0
    )
}
