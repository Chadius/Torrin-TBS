import { ActionEffectType } from "../template/actionEffectTemplate"
import {
    DecidedActionEndTurnEffect,
    DecidedActionEndTurnEffectService,
} from "../decided/decidedActionEndTurnEffect"
import { BattleActionDecisionStep } from "../../battle/actionDecision/battleActionDecisionStep"
import { ActionEffectEndTurnTemplateService } from "../template/actionEffectEndTurnTemplate"

export interface ProcessedActionEndTurnEffect {
    type: ActionEffectType.END_TURN
    decidedActionEffect: DecidedActionEndTurnEffect
}

export const ProcessedActionEndTurnEffectService = {
    new: ({
        battleActionDecisionStep,
    }: {
        battleActionDecisionStep: BattleActionDecisionStep
    }): ProcessedActionEndTurnEffect =>
        ProcessedActionEndTurnEffectService.newFromDecidedActionEffect({
            decidedActionEffect: DecidedActionEndTurnEffectService.new({
                template: ActionEffectEndTurnTemplateService.new({}),
            }),
        }),
    newFromDecidedActionEffect: ({
        decidedActionEffect,
    }: {
        decidedActionEffect: DecidedActionEndTurnEffect
    }): ProcessedActionEndTurnEffect => {
        return sanitize({
            type: ActionEffectType.END_TURN,
            decidedActionEffect,
        })
    },
}

const sanitize = (
    effect: ProcessedActionEndTurnEffect
): ProcessedActionEndTurnEffect => {
    return effect
}
