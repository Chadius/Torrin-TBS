import { ActionEffectType } from "./actionEffectTemplate"

export interface ActionEffectEndTurnTemplate {
    type: ActionEffectType.END_TURN
}

export const ActionEffectEndTurnTemplateService = {
    new: ({}: {}): ActionEffectEndTurnTemplate => {
        return {
            type: ActionEffectType.END_TURN,
        }
    },
}
