import {ActionEffectType} from "../template/actionEffectTemplate";
import {DecidedActionEndTurnEffect} from "../decided/decidedActionEndTurnEffect";

export interface ProcessedActionEndTurnEffect {
    type: ActionEffectType.END_TURN;
    decidedActionEffect: DecidedActionEndTurnEffect;
}

export const ProcessedActionEndTurnEffectService = {
    new: ({decidedActionEffect}: {
        decidedActionEffect: DecidedActionEndTurnEffect,
    }): ProcessedActionEndTurnEffect => {
        return sanitize({
            type: ActionEffectType.END_TURN,
            decidedActionEffect,
        });
    }
}

const sanitize = (effect: ProcessedActionEndTurnEffect): ProcessedActionEndTurnEffect => {
    return effect;
}
