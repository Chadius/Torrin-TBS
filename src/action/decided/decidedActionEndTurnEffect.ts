import {ActionEffectEndTurnTemplate} from "../template/actionEffectEndTurnTemplate";
import {ActionEffectType} from "../template/actionEffectTemplate";

export interface DecidedActionEndTurnEffect {
    type: ActionEffectType.END_TURN,
}

export const DecidedActionEndTurnEffectService = {
    new: ({template}: { template: ActionEffectEndTurnTemplate }): DecidedActionEndTurnEffect => {
        return {
            type: ActionEffectType.END_TURN,
        }
    },
    areDecisionsRequired: (actionEffect: DecidedActionEndTurnEffect): boolean => {
        return false;
    },
}
