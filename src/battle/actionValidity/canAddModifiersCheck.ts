import {
    ActionTemplate,
    ActionTemplateService,
} from "../../action/template/actionTemplate"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { TargetingResults } from "../targeting/targetingService"
import { ActionCheckResult } from "./validityChecker"
import { ActionPerformFailureReason } from "../../squaddie/turn"
import { BattleSquaddie } from "../battleSquaddie"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import { CalculatedEffect } from "../calculator/actionCalculator/calculator"
import { CalculatorMiscellaneous } from "../calculator/actionCalculator/miscellaneous"
import { BattleActionActorContextService } from "../history/battleAction/battleActionActorContext"
import { DegreeOfSuccess } from "../calculator/actionCalculator/degreeOfSuccess"
import { AttributeModifier } from "../../squaddie/attribute/attributeModifier"
import { InBattleAttributesService } from "../stats/inBattleAttributes"
import { AttributeTypeAndAmount } from "../../squaddie/attribute/attribute"

export const CanAddModifiersCheck = {
    canAddAttributeModifiers: ({
        actionTemplate,
        objectRepository,
        validTargetResults,
    }: {
        actionTemplate: ActionTemplate
        objectRepository: ObjectRepository
        validTargetResults: TargetingResults
    }): ActionCheckResult => {
        const actionWillTryToAddModifiers =
            ActionTemplateService.getAttributeModifiers(actionTemplate).length >
            0

        if (!actionWillTryToAddModifiers) {
            return {
                isValid: true,
            }
        }

        if (
            validTargetResults.battleSquaddieIds.inRange
                .values()
                .some((battleSquaddieId) => {
                    const { battleSquaddie, squaddieTemplate } =
                        ObjectRepositoryService.getSquaddieByBattleId(
                            objectRepository,
                            battleSquaddieId
                        )

                    if (
                        willAddModifiersToTarget({
                            actionTemplate,
                            battleSquaddie,
                            squaddieTemplate,
                        })
                    ) {
                        return true
                    }
                })
        ) {
            return {
                isValid: true,
            }
        }

        return {
            isValid: false,
            reason: ActionPerformFailureReason.NO_ATTRIBUTES_WILL_BE_ADDED,
            message: "No modifiers will be added",
        }
    },
    willAddModifiersToTarget: ({
        actionTemplate,
        battleSquaddie,
        squaddieTemplate,
    }: {
        actionTemplate: ActionTemplate
        battleSquaddie: BattleSquaddie
        squaddieTemplate: SquaddieTemplate
    }): boolean =>
        willAddModifiersToTarget({
            actionTemplate,
            battleSquaddie,
            squaddieTemplate,
        }),
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
