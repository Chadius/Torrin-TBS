import { ActionEffectType } from "../template/actionEffectTemplate"
import {
    DecidedActionSquaddieEffect,
    DecidedActionSquaddieEffectService,
} from "../decided/decidedActionSquaddieEffect"
import {
    SquaddieSquaddieResults,
    SquaddieSquaddieResultsService,
} from "../../battle/history/squaddieSquaddieResults"
import { BattleActionSquaddieChange } from "../../battle/history/battleActionSquaddieChange"
import { BattleActionDecisionStep } from "../../battle/actionDecision/battleActionDecisionStep"
import { ActionEffectSquaddieTemplate } from "../template/actionEffectSquaddieTemplate"
import { BattleActionActionContextService } from "../../battle/history/battleAction"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../battle/objectRepository"

export interface ProcessedActionSquaddieEffect {
    type: ActionEffectType.SQUADDIE
    decidedActionEffect: DecidedActionSquaddieEffect
    results: SquaddieSquaddieResults
}

export const ProcessedActionSquaddieEffectService = {
    new: ({
        battleActionDecisionStep,
        battleActionSquaddieChange,
        objectRepository,
    }: {
        battleActionDecisionStep: BattleActionDecisionStep
        battleActionSquaddieChange: BattleActionSquaddieChange
        objectRepository: ObjectRepository
    }): ProcessedActionSquaddieEffect => {
        const action = ObjectRepositoryService.getActionTemplateById(
            objectRepository,
            battleActionDecisionStep.action.actionTemplateId
        )

        return ProcessedActionSquaddieEffectService.newFromDecidedActionEffect({
            decidedActionEffect: DecidedActionSquaddieEffectService.new({
                target: battleActionDecisionStep.target.targetLocation,
                template: action
                    .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
            }),
            results: SquaddieSquaddieResultsService.new({
                actingBattleSquaddieId:
                    battleActionDecisionStep.actor.battleSquaddieId,
                squaddieChanges: [battleActionSquaddieChange],
                targetedBattleSquaddieIds: [
                    battleActionSquaddieChange.battleSquaddieId,
                ],
                actionContext: BattleActionActionContextService.new({}),
            }),
        })
    },
    newFromDecidedActionEffect: ({
        decidedActionEffect,
        results,
    }: {
        decidedActionEffect: DecidedActionSquaddieEffect
        results?: SquaddieSquaddieResults
    }): ProcessedActionSquaddieEffect => {
        return sanitize({
            type: ActionEffectType.SQUADDIE,
            decidedActionEffect,
            results,
        })
    },
    getMultipleAttackPenalty: (
        actionSquaddieEffect: ProcessedActionSquaddieEffect
    ): number => {
        return DecidedActionSquaddieEffectService.getMultipleAttackPenalty(
            actionSquaddieEffect.decidedActionEffect
        )
    },
}

const sanitize = (
    effect: ProcessedActionSquaddieEffect
): ProcessedActionSquaddieEffect => {
    return effect
}
