import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import { BattleSquaddie } from "../battleSquaddie"
import {
    ActionPerformFailureReason,
    SquaddieTurnService,
} from "../../squaddie/turn"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"

export const ActionPointCheck = {
    canAfford: ({
        squaddieTemplate,
        battleSquaddie,
        actionTemplateId,
        objectRepository,
    }: {
        squaddieTemplate: SquaddieTemplate
        battleSquaddie: BattleSquaddie
        actionTemplateId: string
        objectRepository: ObjectRepository
    }): {
        isValid: boolean
        reason?: ActionPerformFailureReason
        message?: string
    } => {
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
