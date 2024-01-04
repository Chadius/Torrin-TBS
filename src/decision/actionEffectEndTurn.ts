import {ActionEffectType} from "./actionEffect";

export interface ActionEffectEndTurn {
    type: ActionEffectType.END_TURN;
}

export const ActionEffectEndTurnService = {
    new: (): ActionEffectEndTurn => {
        return {
            type: ActionEffectType.END_TURN,
        }
    }
}

