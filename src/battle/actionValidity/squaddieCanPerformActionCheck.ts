import { BattleSquaddie } from "../battleSquaddie"
import {
    ActionPerformFailureReason,
    SquaddieTurnService,
} from "../../squaddie/turn"
import { ActionCheckResult } from "./validityChecker"
import { ActionTemplate } from "../../action/template/actionTemplate"
import { InBattleAttributesService } from "../stats/inBattleAttributes"

export const SquaddieCanPerformActionCheck = {
    canPerform: ({
        battleSquaddie,
        actionTemplate,
    }: {
        battleSquaddie: BattleSquaddie
        actionTemplate: ActionTemplate
    }): ActionCheckResult => {
        const { canPerform, reason } = SquaddieTurnService.canPerformAction({
            actionTemplate,
            battleSquaddie,
        })

        if (
            !canPerform &&
            reason == ActionPerformFailureReason.TOO_FEW_ACTIONS_REMAINING
        ) {
            return {
                isValid: false,
                reason,
                message: `Need ${actionTemplate.resourceCost.actionPoints} action point${actionTemplate.resourceCost.actionPoints !== 1 ? "s" : ""}`,
            }
        }

        if (
            !canPerform &&
            reason == ActionPerformFailureReason.STILL_ON_COOLDOWN
        ) {
            const cooldownTurns =
                InBattleAttributesService.getActionTurnsOfCooldown({
                    inBattleAttributes: battleSquaddie.inBattleAttributes,
                    actionTemplateId: actionTemplate.id,
                })
            return {
                isValid: false,
                reason,
                message:
                    cooldownTurns == 1
                        ? "Cooldown: next turn"
                        : `Cooldown: ${cooldownTurns}turns`,
            }
        }

        if (reason == ActionPerformFailureReason.UNKNOWN) {
            return {
                isValid: true,
            }
        }

        return {
            isValid: true,
            warning: true,
            reason: ActionPerformFailureReason.CAN_PERFORM_BUT_TOO_MANY_CONSIDERED_ACTION_POINTS,
        }
    },
}
