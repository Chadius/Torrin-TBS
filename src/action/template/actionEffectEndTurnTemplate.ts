import { ActionEffectType } from "./actionEffectTemplate"
import { ActionDecisionType } from "./actionTemplate"
import { getValidValueOrDefault } from "../../utils/validityCheck"

export interface ActionEffectEndTurnTemplate {
    type: ActionEffectType.END_TURN
    actionDecisions: ActionDecisionType[]
}

export const ActionEffectEndTurnTemplateService = {
    new: ({
        actionDecisions,
    }: {
        actionDecisions?: ActionDecisionType[]
    }): ActionEffectEndTurnTemplate => {
        return {
            type: ActionEffectType.END_TURN,
            actionDecisions: getValidValueOrDefault(actionDecisions, []),
        }
    },
}
