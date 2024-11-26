import { ActionPerformFailureReason } from "../../squaddie/turn"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { ActionCheckResult } from "./validityChecker"
import { BattleActionRecorder } from "../history/battleAction/battleActionRecorder"
import { BattleActionsDuringTurnService } from "../history/battleAction/battleActionsDuringTurn"

export const PerRoundCheck = {
    withinLimitedUsesThisRound: ({
        actionTemplateId,
        objectRepository,
        battleActionRecorder,
    }: {
        actionTemplateId: string
        objectRepository: ObjectRepository
        battleActionRecorder: BattleActionRecorder
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

        if (actionTemplate.resourceCost.numberOfTimesPerRound == undefined) {
            return {
                isValid: true,
            }
        }

        const allActions = BattleActionsDuringTurnService.getAll(
            battleActionRecorder.actionsAlreadyAnimatedThisTurn
        )

        const numberOfTimesAlreadyUsedThisRound = allActions.filter(
            (battleAction) =>
                battleAction.action.actionTemplateId === actionTemplate.id
        ).length
        if (
            numberOfTimesAlreadyUsedThisRound >=
            actionTemplate.resourceCost.numberOfTimesPerRound
        ) {
            return {
                isValid: false,
                reason: ActionPerformFailureReason.TOO_MANY_USES_THIS_ROUND,
                message:
                    actionTemplate.resourceCost.numberOfTimesPerRound > 1
                        ? `Already used ${actionTemplate.resourceCost.numberOfTimesPerRound} times`
                        : "Already used this round",
            }
        }

        return {
            isValid: true,
        }
    },
}
