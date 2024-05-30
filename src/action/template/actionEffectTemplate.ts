import { ActionEffectSquaddieTemplate } from "./actionEffectSquaddieTemplate"
import { ActionEffectMovementTemplate } from "./actionEffectMovementTemplate"
import { ActionEffectEndTurnTemplate } from "./actionEffectEndTurnTemplate"

export type ActionEffectTemplate =
    | ActionEffectSquaddieTemplate
    | ActionEffectMovementTemplate
    | ActionEffectEndTurnTemplate

export enum ActionEffectType {
    END_TURN = "END_TURN",
    MOVEMENT = "MOVEMENT",
    SQUADDIE = "SQUADDIE",
}
