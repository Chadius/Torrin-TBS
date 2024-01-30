import {ActionEffectType} from "../template/actionEffectTemplate";
import {DecidedActionSquaddieEffect} from "../decided/decidedActionSquaddieEffect";
import {ActionResultPerSquaddie} from "../../battle/history/actionResultPerSquaddie";
import {DecidedActionMovementEffect} from "../decided/decidedActionMovementEffect";

export interface ProcessedActionMovementEffect {
    type: ActionEffectType.SQUADDIE;
    decidedActionEffect: DecidedActionMovementEffect;
}

export const ProcessedActionMovementEffectService = {
    new: ({decidedActionEffect}:{
        decidedActionEffect: DecidedActionMovementEffect,
    }): ProcessedActionMovementEffect => {
        return sanitize({
            type: ActionEffectType.SQUADDIE,
            decidedActionEffect,
        });
    }
}

const sanitize = (effect: ProcessedActionMovementEffect): ProcessedActionMovementEffect => {
    return effect;
}
