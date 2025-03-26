import { MissionMap } from "../../missionMap/missionMap"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { ActionCheckResult } from "./validityChecker"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { TargetingResultsService } from "../targeting/targetingService"
import { ActionPerformFailureReason } from "../../squaddie/turn"
import { ActionTemplateService } from "../../action/template/actionTemplate"
import { ActionValidityUtils } from "./common"

export const CanHealTargetCheck = {
    targetInRangeCanBeAffected: ({
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

        const actionHeals =
            ActionTemplateService.getTotalHealing(actionTemplate) > 0
        if (!actionHeals) {
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
            targetingResults.battleSquaddieIdsInRange.some(
                (battleSquaddieId) => {
                    const { battleSquaddie, squaddieTemplate } =
                        getResultOrThrowError(
                            ObjectRepositoryService.getSquaddieByBattleId(
                                objectRepository,
                                battleSquaddieId
                            )
                        )

                    if (
                        actionHeals &&
                        ActionValidityUtils.estimatedHealingOnTarget({
                            battleSquaddie,
                            squaddieTemplate,
                            actionTemplate,
                        }) > 0
                    ) {
                        return true
                    }
                }
            )
        ) {
            return {
                isValid: true,
            }
        }

        return {
            isValid: false,
            reason: ActionPerformFailureReason.HEAL_HAS_NO_EFFECT,
            message: "No one needs healing",
        }
    },
}
