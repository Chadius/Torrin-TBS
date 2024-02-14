import {ActionEffectType} from "../template/actionEffectTemplate";
import {DecidedActionSquaddieEffect, DecidedActionSquaddieEffectService} from "../decided/decidedActionSquaddieEffect";
import {SquaddieSquaddieResults} from "../../battle/history/squaddieSquaddieResults";

export interface ProcessedActionSquaddieEffect {
    type: ActionEffectType.SQUADDIE;
    decidedActionEffect: DecidedActionSquaddieEffect;
    results: SquaddieSquaddieResults;
}

export const ProcessedActionSquaddieEffectService = {
    new: ({decidedActionEffect, results}: {
        decidedActionEffect: DecidedActionSquaddieEffect,
        results?: SquaddieSquaddieResults,
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
