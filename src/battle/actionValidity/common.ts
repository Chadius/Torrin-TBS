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

export const ActionValidityUtils = {
    estimatedHealingOnTarget: ({
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
    },
}
