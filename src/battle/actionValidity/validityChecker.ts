import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { ActionPointCheck } from "./actionPointCheck"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { BuffSelfCheck } from "./buffSelfCheck"
import { ActionPerformFailureReason } from "../../squaddie/turn"
import { PerRoundCheck } from "./perRoundCheck"
import { GameEngineState } from "../../gameEngine/gameEngine"

export type ActionValidityStatus = {
    disabled: boolean
    messages: string[]
}

export type ActionCheckResult = {
    isValid: boolean
    reason?: ActionPerformFailureReason
    message?: string
}

export const ValidityCheckService = {
    calculateActionValidity: ({
        objectRepository,
        battleSquaddieId,
        gameEngineState,
    }: {
        objectRepository: ObjectRepository
        battleSquaddieId: string
        gameEngineState: GameEngineState
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
                    PerRoundCheck.withinLimitedUsesThisRound({
                        battleActionRecorder:
                            gameEngineState.battleOrchestratorState.battleState
                                .battleActionRecorder,
                        objectRepository,
                        actionTemplateId,
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
