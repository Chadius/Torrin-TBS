import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent,
} from "../orchestrator/battleOrchestratorComponent"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { UIControlSettings } from "../orchestrator/uiControlSettings"
import { BattleOrchestratorMode } from "../orchestrator/battleOrchestrator"
import { BattleStateService } from "../orchestrator/battleState"
import { isValidValue } from "../../utils/validityCheck"
import { BattleSquaddieTeamService } from "../battleSquaddieTeam"
import { BattleActionDecisionStepService } from "../actionDecision/battleActionDecisionStep"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { BattleActionService } from "../history/battleAction"
import { BattleActionQueueService } from "../history/battleActionQueue"

export class PlayerHudController implements BattleOrchestratorComponent {
    hasCompleted(gameEngineState: GameEngineState): boolean {
        return true
    }

    keyEventHappened(
        gameEngineState: GameEngineState,
        event: OrchestratorComponentKeyEvent
    ): void {
        // Required by inheritance
    }

    mouseEventHappened(
        gameEngineState: GameEngineState,
        event: OrchestratorComponentMouseEvent
    ): void {
        // Required by inheritance
    }

    recommendStateChanges(
        gameEngineState: GameEngineState
    ): BattleOrchestratorChanges | undefined {
        const actionBuilderState =
            gameEngineState.battleOrchestratorState.battleState
                .battleActionDecisionStep

        const battleActionQueueIsEmpty = BattleActionQueueService.isEmpty(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionQueue
        )

        const battleActionHasAnimated =
            !battleActionQueueIsEmpty &&
            BattleActionService.isAnimationComplete(
                BattleActionQueueService.peek(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionQueue
                )
            )

        if (
            !playerCanControlAtLeastOneSquaddie(gameEngineState) &&
            (BattleActionDecisionStepService.isSquaddieActionRecordNotSet(
                actionBuilderState
            ) ||
                battleActionQueueIsEmpty ||
                battleActionHasAnimated)
        ) {
            return {
                displayMap: true,
                nextMode: BattleOrchestratorMode.COMPUTER_SQUADDIE_SELECTOR,
            }
        }

        if (
            !BattleActionDecisionStepService.isActorSet(actionBuilderState) ||
            !BattleActionDecisionStepService.isActionSet(actionBuilderState)
        ) {
            return {
                displayMap: true,
                nextMode: BattleOrchestratorMode.PLAYER_SQUADDIE_SELECTOR,
            }
        }

        if (actionBuilderState.action.endTurn) {
            return {
                displayMap: true,
                nextMode: BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP,
            }
        }

        if (actionBuilderState.action.movement) {
            return {
                displayMap: true,
                nextMode: BattleOrchestratorMode.SQUADDIE_MOVER,
            }
        }

        if (actionBuilderState?.action?.actionTemplateId) {
            if (
                BattleActionDecisionStepService.isTargetConfirmed(
                    actionBuilderState
                )
            ) {
                return {
                    displayMap: true,
                    nextMode:
                        BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE,
                }
            }

            return {
                displayMap: true,
                nextMode: BattleOrchestratorMode.PLAYER_SQUADDIE_TARGET,
            }
        }

        return {
            displayMap: true,
            nextMode: undefined,
        }
    }

    reset(gameEngineState: GameEngineState): void {
        // Required by inheritance
    }

    uiControlSettings(gameEngineState: GameEngineState): UIControlSettings {
        return undefined
    }

    update(
        gameEngineState: GameEngineState,
        graphicsContext: GraphicsBuffer
    ): void {
        // Required by inheritance
    }
}

const playerCanControlAtLeastOneSquaddie = (
    gameEngineState: GameEngineState
): boolean => {
    const currentTeam = BattleStateService.getCurrentTeam(
        gameEngineState.battleOrchestratorState.battleState,
        gameEngineState.repository
    )
    if (!isValidValue(currentTeam)) {
        return false
    }
    return BattleSquaddieTeamService.canPlayerControlAnySquaddieOnThisTeamRightNow(
        currentTeam,
        gameEngineState.repository
    )
}
