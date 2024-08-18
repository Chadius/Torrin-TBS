import { ActionEffectType } from "./actionEffectTemplate"
import { ActionDecisionType } from "./actionTemplate"
import { getValidValueOrDefault } from "../../utils/validityCheck"

export interface ActionEffectMovementTemplate {
    type: ActionEffectType.MOVEMENT
    actionDecisions: ActionDecisionType[]
}

export const ActionEffectMovementTemplateService = {
    new: ({
        actionDecisions,
    }: {
        actionDecisions?: ActionDecisionType[]
    }): ActionEffectMovementTemplate => {
        return {
            type: ActionEffectType.MOVEMENT,
            actionDecisions: getValidValueOrDefault(actionDecisions, [
                ActionDecisionType.LOCATION_SELECTION,
            ]),
        }
    },
}
