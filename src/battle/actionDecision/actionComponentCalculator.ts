import {
    BattleActionDecisionStep,
    BattleActionDecisionStepService,
} from "./battleActionDecisionStep"
import { BattleOrchestratorMode } from "../orchestrator/battleOrchestrator"
import { isValidValue } from "../../utils/validityCheck"
import { ActionDecisionType } from "../../action/template/actionTemplate"
import {
    BattleActionQueue,
    BattleActionQueueService,
} from "../history/battleActionQueue"
import { BattleAction } from "../history/battleAction"

export const ActionComponentCalculator = {
    getNextOrchestratorComponentMode: (
        actionBuilderState: BattleActionDecisionStep
    ): BattleOrchestratorMode => {
        const selectorMode = BattleOrchestratorMode.PLAYER_SQUADDIE_SELECTOR

        if (!isValidValue(actionBuilderState)) {
            return selectorMode
        }

        if (
            !BattleActionDecisionStepService.isActorSet(actionBuilderState) ||
            !BattleActionDecisionStepService.isActionSet(actionBuilderState)
        ) {
            return selectorMode
        }

        const actionIsEndTurn =
            BattleActionDecisionStepService.getAction(actionBuilderState)
                .endTurn === true
        if (actionIsEndTurn) {
            return BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP
        }

        const actionIsMovement =
            BattleActionDecisionStepService.getAction(actionBuilderState)
                .movement === true
        const targetIsConfirmed =
            BattleActionDecisionStepService.isTargetConfirmed(
                actionBuilderState
            ) === true

        if (actionIsMovement && targetIsConfirmed) {
            return BattleOrchestratorMode.SQUADDIE_MOVER
        }

        if (!targetIsConfirmed) {
            return BattleOrchestratorMode.PLAYER_SQUADDIE_TARGET
        }

        return BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE
    },
    getNextModeBasedOnBattleActionQueue: (
        battleActionQueue: BattleActionQueue
    ): BattleOrchestratorMode => {
        if (BattleActionQueueService.isEmpty(battleActionQueue)) {
            return BattleOrchestratorMode.PLAYER_HUD_CONTROLLER
        }

        const nextBattleAction: BattleAction =
            BattleActionQueueService.peek(battleActionQueue)

        switch (true) {
            case !!nextBattleAction.action.actionTemplateId:
                return BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE
            case nextBattleAction.action.isMovement:
                return BattleOrchestratorMode.SQUADDIE_MOVER
            case nextBattleAction.action.isEndTurn:
                return BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP
            default:
                return BattleOrchestratorMode.PLAYER_HUD_CONTROLLER
        }
    },
    getPendingActionDecisions: (
        actionBuilderState: BattleActionDecisionStep
    ): ActionDecisionType[] => {
        if (!isValidValue(actionBuilderState)) {
            return [
                ActionDecisionType.ACTOR_SELECTION,
                ActionDecisionType.ACTION_SELECTION,
            ]
        }

        let actorAndActionMissing: ActionDecisionType[] = []
        if (!BattleActionDecisionStepService.isActorSet(actionBuilderState)) {
            actorAndActionMissing.push(ActionDecisionType.ACTOR_SELECTION)
        }
        if (!BattleActionDecisionStepService.isActionSet(actionBuilderState)) {
            actorAndActionMissing.push(ActionDecisionType.ACTION_SELECTION)
        }
        if (actorAndActionMissing.length > 0) {
            return actorAndActionMissing
        }

        if (
            !BattleActionDecisionStepService.isTargetConfirmed(
                actionBuilderState
            )
        ) {
            return [ActionDecisionType.TARGET_SQUADDIE]
        }

        return []
    },
}
