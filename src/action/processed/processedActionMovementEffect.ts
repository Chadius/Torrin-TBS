import {ActionEffectType} from "../template/actionEffectTemplate";
import {DecidedActionMovementEffect} from "../decided/decidedActionMovementEffect";

export interface ProcessedActionMovementEffect {
    type: ActionEffectType.MOVEMENT;
    decidedActionEffect: DecidedActionMovementEffect;
}

export const ProcessedActionMovementEffectService = {
    new: ({decidedActionEffect}: {
        decidedActionEffect: DecidedActionMovementEffect,
    }): ProcessedActionMovementEffect => {
        return sanitize({
            type: ActionEffectType.MOVEMENT,
            decidedActionEffect,
        });
    }
}

const sanitize = (effect: ProcessedActionMovementEffect): ProcessedActionMovementEffect => {
    return effect;
}
