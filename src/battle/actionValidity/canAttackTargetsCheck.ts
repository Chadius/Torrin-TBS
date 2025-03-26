import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { ActionCheckResult } from "./validityChecker"
import { TargetingResultsService } from "../targeting/targetingService"
import { MissionMap } from "../../missionMap/missionMap"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { ActionPerformFailureReason } from "../../squaddie/turn"
import { ActionTemplateService } from "../../action/template/actionTemplate"

export const CanAttackTargetsCheck = {
    targetsAreInRangeOfThisAttack: ({
        actorSquaddieId,
        actionTemplateId,
        objectRepository,
        missionMap,
    }: {
        missionMap: MissionMap
        actorSquaddieId: string
        actionTemplateId: string
        objectRepository: ObjectRepository
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

        const {
            battleSquaddie: actingBattleSquaddie,
            squaddieTemplate: actingSquaddieTemplate,
        } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                objectRepository,
                actorSquaddieId
            )
        )

        const targetingResults = TargetingResultsService.findValidTargets({
            map: missionMap,
            actingBattleSquaddie,
            actingSquaddieTemplate,
            actionTemplate,
            squaddieRepository: objectRepository,
        })

        if (
            actionDealsDamage &&
            targetingResults.battleSquaddieIdsInRange.length > 0
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
