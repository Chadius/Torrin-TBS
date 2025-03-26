import { BattleSquaddie } from "../battleSquaddie"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import {
    ActionEffectTemplate,
    TargetBySquaddieAffiliationRelation,
} from "../../action/template/actionEffectTemplate"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../action/template/actionTemplate"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import { AttributeModifier } from "../../squaddie/attribute/attributeModifier"
import { InBattleAttributesService } from "../stats/inBattleAttributes"
import { CalculatorMiscellaneous } from "../calculator/actionCalculator/miscellaneous"
import { DegreeOfSuccess } from "../calculator/actionCalculator/degreeOfSuccess"
import { BattleActionActorContextService } from "../history/battleAction/battleActionActorContext"
import { CalculatedEffect } from "../calculator/actionCalculator/calculator"
import { ActionPerformFailureReason } from "../../squaddie/turn"
import { ActionCheckResult } from "./validityChecker"
import { AttributeTypeAndAmount } from "../../squaddie/attribute/attributeType"
import { ActionValidityUtils } from "./common"

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
            ActionValidityUtils.estimatedHealingOnTarget({
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
        actionEffectSquaddieTemplate.targetConstraints
            .squaddieAffiliationRelation[
            TargetBySquaddieAffiliationRelation.TARGET_FOE
        ] ||
        actionEffectSquaddieTemplate.targetConstraints
            .squaddieAffiliationRelation[
            TargetBySquaddieAffiliationRelation.TARGET_ALLY
        ]

    const targetsSelf = (
        actionEffectSquaddieTemplate: ActionEffectTemplate
    ): boolean =>
        actionEffectSquaddieTemplate.targetConstraints
            .squaddieAffiliationRelation[
            TargetBySquaddieAffiliationRelation.TARGET_SELF
        ]

    const onlyTargetsSelf = (
        actionEffectSquaddieTemplate: ActionEffectTemplate
    ): boolean =>
        !targetsOthers(actionEffectSquaddieTemplate) &&
        targetsSelf(actionEffectSquaddieTemplate)

    return actionEffectSquaddieTemplates.every(onlyTargetsSelf)
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
        actionEffectSquaddieTemplates.map((actionEffectTemplate) => {
            return CalculatorMiscellaneous.calculateEffectBasedOnDegreeOfSuccess(
                {
                    actionEffectTemplate,
                    actorContext: BattleActionActorContextService.new({
                        actingSquaddieModifiers: [],
                        targetSquaddieModifiers: {},
                    }),
                    degreeOfSuccess: DegreeOfSuccess.SUCCESS,
                    targetSquaddieTemplate: squaddieTemplate,
                    targetBattleSquaddie: battleSquaddie,
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
