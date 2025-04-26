import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { ActionCheckResult } from "./validityChecker"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { TargetingResults } from "../targeting/targetingService"
import { ActionPerformFailureReason } from "../../squaddie/turn"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../action/template/actionTemplate"
import { BattleSquaddie } from "../battleSquaddie"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import { CalculatedEffect } from "../calculator/actionCalculator/calculator"
import { CalculatorMiscellaneous } from "../calculator/actionCalculator/miscellaneous"
import { BattleActionActorContextService } from "../history/battleAction/battleActionActorContext"
import { DegreeOfSuccess } from "../calculator/actionCalculator/degreeOfSuccess"

export const CanHealTargetCheck = {
    targetInRangeCanBeAffected: ({
        actionTemplate,
        objectRepository,
        validTargetResults,
    }: {
        actionTemplate: ActionTemplate
        objectRepository: ObjectRepository
        validTargetResults: TargetingResults
    }): ActionCheckResult => {
        const actionHeals =
            ActionTemplateService.getTotalHealing(actionTemplate) > 0
        if (!actionHeals) {
            return {
                isValid: true,
            }
        }

        if (
            validTargetResults.battleSquaddieIdsInRange.some(
                (battleSquaddieId) => {
                    const { battleSquaddie, squaddieTemplate } =
                        getResultOrThrowError(
                            ObjectRepositoryService.getSquaddieByBattleId(
                                objectRepository,
                                battleSquaddieId
                            )
                        )

                    if (
                        actionHeals &&
                        calculateHealingOnTarget({
                            battleSquaddie,
                            squaddieTemplate,
                            actionTemplate,
                        }) > 0
                    ) {
                        return true
                    }
                }
            )
        ) {
            return {
                isValid: true,
            }
        }

        return {
            isValid: false,
            reason: ActionPerformFailureReason.HEAL_HAS_NO_EFFECT,
            message: "No one needs healing",
        }
    },
    calculateHealingOnTarget: ({
        actionTemplate,
        battleSquaddie,
        squaddieTemplate,
    }: {
        actionTemplate: ActionTemplate
        battleSquaddie: BattleSquaddie
        squaddieTemplate: SquaddieTemplate
    }): number =>
        calculateHealingOnTarget({
            actionTemplate,
            battleSquaddie,
            squaddieTemplate,
        }),
}

const calculateHealingOnTarget = ({
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

    return calculatedEffects.reduce((sum, calculatedEffect) => {
        return sum + calculatedEffect.healingReceived
    }, 0)
}
