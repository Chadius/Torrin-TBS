import { BattleSquaddie } from "../battleSquaddie"
import {
    ActionPerformFailureReason,
    SquaddieTurnService,
} from "../../squaddie/turn"
import { ObjectRepository } from "../objectRepository"
import { ActionCheckResult } from "./validityChecker"
import { PlayerConsideredActions } from "../battleState/playerConsideredActions"
import { ActionTemplate } from "../../action/template/actionTemplate"

export const ActionPointCheck = {
    canAfford: ({
        battleSquaddie,
        actionTemplate,
        objectRepository,
        playerConsideredActions,
    }: {
        battleSquaddie: BattleSquaddie
        actionTemplate: ActionTemplate
        objectRepository: ObjectRepository
        playerConsideredActions: PlayerConsideredActions
    }): ActionCheckResult => {
        const { canPerform, reason } = SquaddieTurnService.canPerformAction({
            actionTemplate,
            battleSquaddie,
            playerConsideredActions,
            objectRepository,
        })

        if (!canPerform) {
            return {
                isValid: false,
                reason,
                message: `Need ${actionTemplate.resourceCost.actionPoints} action point${actionTemplate.resourceCost.actionPoints !== 1 ? "s" : ""}`,
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
