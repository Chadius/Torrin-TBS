import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { ActionCheckResult, ActionPointCheck } from "./actionPointCheck"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { BuffSelfCheck } from "./buffSelfCheck"

export type ActionValidityStatus = {
    disabled: boolean
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
                    messages: [],
                }

                const actionCheckResults: ActionCheckResult[] = [
                    ActionPointCheck.canAfford({
                        battleSquaddie,
                        objectRepository,
                        actionTemplateId,
                    }),
                    BuffSelfCheck.willBuffUser({
                        battleSquaddie,
                        objectRepository,
                        actionTemplateId,
                        squaddieTemplate,
                    }),
                ]

                actionCheckResults.forEach((result) => {
                    overallStatus[actionTemplateId] = updateActionStatus(
                        overallStatus[actionTemplateId],
                        result,
                        true
                    )
                })
            }
        )

        return overallStatus
    },
}
