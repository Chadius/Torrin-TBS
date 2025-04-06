import {
    BattleActionDecisionStep,
    BattleActionDecisionStepService,
} from "./battleActionDecisionStep"
import { BattleOrchestratorMode } from "../orchestrator/battleOrchestrator"
import { isValidValue } from "../../utils/objectValidityCheck"
import { ActionDecisionType } from "../../action/template/actionTemplate"
import { BattleAction } from "../history/battleAction/battleAction"
import {
    BattleActionRecorder,
    BattleActionRecorderService,
} from "../history/battleAction/battleActionRecorder"

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
            return BattleOrchestratorMode.PLAYER_ACTION_TARGET_SELECT
        }

        return BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE
    },
    getNextModeBasedOnBattleActionRecorder: (
        battleActionRecorder: BattleActionRecorder
    ): BattleOrchestratorMode => {
        if (
            BattleActionRecorderService.isAnimationQueueEmpty(
                battleActionRecorder
            )
        ) {
            return BattleOrchestratorMode.PLAYER_HUD_CONTROLLER
        }

        const nextBattleAction: BattleAction =
            BattleActionRecorderService.peekAtAnimationQueue(
                battleActionRecorder
            )

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
