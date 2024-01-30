import {ActionEffectType} from "./actionEffectTemplate";

export interface ActionEffectMovementTemplate {
    type: ActionEffectType.MOVEMENT;
}

export const ActionEffectMovementTemplateService = {
    new: ({}: {}): ActionEffectMovementTemplate => {
        return {
            type: ActionEffectType.MOVEMENT
        }
    }
}
