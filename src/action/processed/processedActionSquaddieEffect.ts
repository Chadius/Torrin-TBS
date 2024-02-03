import {ActionEffectType} from "../template/actionEffectTemplate";
import {DecidedActionSquaddieEffect, DecidedActionSquaddieEffectService} from "../decided/decidedActionSquaddieEffect";
import {ActionResultPerSquaddie} from "../../battle/history/actionResultPerSquaddie";

export interface ProcessedActionSquaddieEffect {
    type: ActionEffectType.SQUADDIE;
    decidedActionEffect: DecidedActionSquaddieEffect;
    results: { [battleSquaddieId: string]: ActionResultPerSquaddie };
}

export const ProcessedActionSquaddieEffectService = {
    new: ({decidedActionEffect, results}: {
        decidedActionEffect: DecidedActionSquaddieEffect,
        results?: { [_: string]: ActionResultPerSquaddie },
    }): ProcessedActionSquaddieEffect => {
        return sanitize({
            type: ActionEffectType.SQUADDIE,
            decidedActionEffect,
            results
        });
    },
    getMultipleAttackPenalty: (actionSquaddieEffect: ProcessedActionSquaddieEffect): number => {
        return DecidedActionSquaddieEffectService.getMultipleAttackPenalty(actionSquaddieEffect.decidedActionEffect);
    }
}

const sanitize = (effect: ProcessedActionSquaddieEffect): ProcessedActionSquaddieEffect => {
    return effect;
}
