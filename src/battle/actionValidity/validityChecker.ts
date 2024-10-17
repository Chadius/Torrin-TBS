import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { ActionCheckResult, ActionPointCheck } from "./actionPointCheck"
import { getResultOrThrowError } from "../../utils/ResultOrError"

export type ActionValidityStatus = {
    disabled: boolean
    warn: boolean
    messages: string[]
}

export const ValidityCheckService = {
    calculateActionValidity: ({
        objectRepository,
        battleSquaddieId,
    }: {
        objectRepository: ObjectRepository
        battleSquaddieId: string
    }): {
        [actionTemplateId: string]: ActionValidityStatus
    } => {
        const updateActionStatus = (
            currentStatus: ActionValidityStatus,
            actionCheckResult: ActionCheckResult,
            shouldDisableIfInvalid: boolean
        ): ActionValidityStatus => {
            if (actionCheckResult.isValid) {
                return currentStatus
            }

            currentStatus.warn = true
            if (shouldDisableIfInvalid) {
                currentStatus.disabled = true
            }
            currentStatus.messages.push(actionCheckResult.message)
            return currentStatus
        }

        const overallStatus: {
            [actionTemplateId: string]: ActionValidityStatus
        } = {}

        const { battleSquaddie, squaddieTemplate } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                objectRepository,
                battleSquaddieId
            )
        )
        squaddieTemplate.actionTemplateIds.forEach(
            (actionTemplateId: string) => {
                overallStatus[actionTemplateId] = {
                    disabled: false,
                    warn: false,
                    messages: [],
                }

                const actionPointCheckResult = ActionPointCheck.canAfford({
                    battleSquaddie,
                    objectRepository,
                    actionTemplateId,
                })
                overallStatus[actionTemplateId] = updateActionStatus(
                    overallStatus[actionTemplateId],
                    actionPointCheckResult,
                    true
                )
            }
        )

        return overallStatus
    },
}
