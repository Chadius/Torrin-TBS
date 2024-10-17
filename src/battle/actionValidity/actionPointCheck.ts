import { BattleSquaddie } from "../battleSquaddie"
import {
    ActionPerformFailureReason,
    SquaddieTurnService,
} from "../../squaddie/turn"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"

export type ActionCheckResult = {
    isValid: boolean
    reason?: ActionPerformFailureReason
    message?: string
}

export const ActionPointCheck = {
    canAfford: ({
        battleSquaddie,
        actionTemplateId,
        objectRepository,
    }: {
        battleSquaddie: BattleSquaddie
        actionTemplateId: string
        objectRepository: ObjectRepository
    }): ActionCheckResult => {
        const actionTemplate = ObjectRepositoryService.getActionTemplateById(
            objectRepository,
            actionTemplateId
        )
        if (!actionTemplate) {
            return {
                isValid: true,
            }
        }

        const { canPerform, reason } = SquaddieTurnService.canPerformAction(
            battleSquaddie.squaddieTurn,
            actionTemplate
        )

        if (!canPerform) {
            return {
                isValid: false,
                reason,
                message: `Need ${actionTemplate.actionPoints} action point${actionTemplate.actionPoints !== 1 ? "s" : ""}`,
            }
        }

        return {
            isValid: true,
        }
    },
}
