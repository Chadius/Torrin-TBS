import { BattleSquaddie } from "../battleSquaddie"
import {
    ActionPerformFailureReason,
    SquaddieTurnService,
} from "../../squaddie/turn"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { ActionCheckResult } from "./validityChecker"
import { PlayerConsideredActions } from "../battleState/playerConsideredActions"

export const ActionPointCheck = {
    canAfford: ({
        battleSquaddie,
        actionTemplateId,
        objectRepository,
        playerConsideredActions,
    }: {
        battleSquaddie: BattleSquaddie
        actionTemplateId: string
        objectRepository: ObjectRepository
        playerConsideredActions: PlayerConsideredActions
    }): ActionCheckResult => {
        const actionTemplate = ObjectRepositoryService.getActionTemplateById(
            objectRepository,
            actionTemplateId
        )
        if (!actionTemplate) {
            return {
                isValid: true,
                message: `action template not found: ${actionTemplateId}`,
            }
        }

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
            reason: ActionPerformFailureReason.CAN_PERFORM_BUT_TOO_MANY_CONSIDERED_ACTION_POINTS,
        }
    },
}
