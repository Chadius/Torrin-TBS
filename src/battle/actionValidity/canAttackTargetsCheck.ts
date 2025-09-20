import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { ActionCheckResult } from "./validityChecker"
import { TargetingResults } from "../targeting/targetingService"
import { ActionPerformFailureReason } from "../../squaddie/turn"
import { ActionTemplateService } from "../../action/template/actionTemplate"

export const CanAttackTargetsCheck = {
    targetsAreInRangeOfThisAttack: ({
        actionTemplateId,
        objectRepository,
        validTargetResults,
    }: {
        actionTemplateId: string
        objectRepository: ObjectRepository
        validTargetResults: TargetingResults
    }): ActionCheckResult => {
        const actionTemplate = ObjectRepositoryService.getActionTemplateById(
            objectRepository,
            actionTemplateId
        )

        const actionDealsDamage =
            ActionTemplateService.getTotalDamage(actionTemplate)
        if (!actionDealsDamage) {
            return {
                isValid: true,
            }
        }

        if (
            actionDealsDamage &&
            validTargetResults.battleSquaddieIds.inRange.size > 0
        ) {
            return {
                isValid: true,
            }
        }

        return {
            isValid: false,
            reason: ActionPerformFailureReason.NO_TARGETS_IN_RANGE,
            message: "No targets in range",
        }
    },
}
