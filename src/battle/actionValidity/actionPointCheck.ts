import { BattleSquaddie } from "../battleSquaddie"
import { SquaddieTurnService } from "../../squaddie/turn"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { ActionCheckResult } from "./validityChecker"

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
                message: `Need ${actionTemplate.resourceCost.actionPoints} action point${actionTemplate.resourceCost.actionPoints !== 1 ? "s" : ""}`,
            }
        }

        return {
            isValid: true,
        }
    },
}
