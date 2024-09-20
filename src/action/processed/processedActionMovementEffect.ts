import { ActionEffectType } from "../template/actionEffectTemplate"
import {
    DecidedActionMovementEffect,
    DecidedActionMovementEffectService,
} from "../decided/decidedActionMovementEffect"
import { BattleActionDecisionStep } from "../../battle/actionDecision/battleActionDecisionStep"
import { ActionEffectMovementTemplateService } from "../template/actionEffectMovementTemplate"

export interface ProcessedActionMovementEffect {
    type: ActionEffectType.MOVEMENT
    decidedActionEffect: DecidedActionMovementEffect
}

export const ProcessedActionMovementEffectService = {
    new: ({
        battleActionDecisionStep,
    }: {
        battleActionDecisionStep: BattleActionDecisionStep
    }): ProcessedActionMovementEffect =>
        ProcessedActionMovementEffectService.newFromDecidedActionEffect({
            decidedActionEffect: DecidedActionMovementEffectService.new({
                template: ActionEffectMovementTemplateService.new({}),
                destination: battleActionDecisionStep.target.targetLocation,
            }),
        }),
    newFromDecidedActionEffect: ({
        decidedActionEffect,
    }: {
        decidedActionEffect: DecidedActionMovementEffect
    }): ProcessedActionMovementEffect => {
        return sanitize({
            type: ActionEffectType.MOVEMENT,
            decidedActionEffect,
        })
    },
}

const sanitize = (
    effect: ProcessedActionMovementEffect
): ProcessedActionMovementEffect => {
    return effect
}
