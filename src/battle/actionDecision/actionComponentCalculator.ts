import {
    BattleActionDecisionStep,
    BattleActionDecisionStepService,
} from "./battleActionDecisionStep"
import { BattleOrchestratorMode } from "../orchestrator/battleOrchestrator"
import { isValidValue } from "../../utils/validityCheck"
import { ActionEffectType } from "../../action/template/actionEffectTemplate"
import {
    ActionsThisRound,
    ActionsThisRoundService,
} from "../history/actionsThisRound"
import { ActionDecisionType } from "../../action/template/actionTemplate"

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
    getNextModeBasedOnActionsThisRound: (
        actionsThisRound: ActionsThisRound
    ): BattleOrchestratorMode => {
        const processedActionEffect =
            ActionsThisRoundService.getProcessedActionEffectToShow(
                actionsThisRound
            )
        if (!isValidValue(processedActionEffect)) {
            return undefined
        }

        switch (processedActionEffect.type) {
            case ActionEffectType.SQUADDIE:
                return BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE
            case ActionEffectType.MOVEMENT:
                return BattleOrchestratorMode.SQUADDIE_MOVER
            case ActionEffectType.END_TURN:
                return BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP
            default:
                return undefined
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
