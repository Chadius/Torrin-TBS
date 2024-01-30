import {TODODELETEMEActionEffectType} from "./TODODELETEMEactionEffect";

export interface TODODELETEMEactionEffectEndTurn {
    type: TODODELETEMEActionEffectType.END_TURN;
}

export const ActionEffectEndTurnService = {
    new: (): TODODELETEMEactionEffectEndTurn => {
        return {
            type: TODODELETEMEActionEffectType.END_TURN,
        }
    }
}

