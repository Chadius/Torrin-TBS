import {
    BattleActionDecisionStep,
    BattleActionDecisionStepService,
} from "./battleActionDecisionStep"
import {
    BattleOrchestratorMode,
    TBattleOrchestratorMode,
} from "../orchestrator/battleOrchestrator"
import { isValidValue } from "../../utils/objectValidityCheck"
import {
    ActionDecision,
    TActionDecision,
} from "../../action/template/actionTemplate"
import { BattleAction } from "../history/battleAction/battleAction"
import {
    BattleActionRecorder,
    BattleActionRecorderService,
} from "../history/battleAction/battleActionRecorder"

export const ActionComponentCalculator = {
    getNextModeBasedOnBattleActionRecorder: (
        battleActionRecorder: BattleActionRecorder
    ): TBattleOrchestratorMode => {
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
    ): TActionDecision[] => {
        if (!isValidValue(actionBuilderState)) {
            return [
                ActionDecision.ACTOR_SELECTION,
                ActionDecision.ACTION_SELECTION,
            ]
        }

        let actorAndActionMissing: TActionDecision[] = []
        if (!BattleActionDecisionStepService.isActorSet(actionBuilderState)) {
            actorAndActionMissing.push(ActionDecision.ACTOR_SELECTION)
        }
        if (!BattleActionDecisionStepService.isActionSet(actionBuilderState)) {
            actorAndActionMissing.push(ActionDecision.ACTION_SELECTION)
        }
        if (actorAndActionMissing.length > 0) {
            return actorAndActionMissing
        }

        if (
            !BattleActionDecisionStepService.isTargetConfirmed(
                actionBuilderState
            )
        ) {
            return [ActionDecision.TARGET_SQUADDIE]
        }

        return []
    },
}
