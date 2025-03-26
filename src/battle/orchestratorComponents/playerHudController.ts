import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent,
} from "../orchestrator/battleOrchestratorComponent"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { UIControlSettings } from "../orchestrator/uiControlSettings"
import { BattleOrchestratorMode } from "../orchestrator/battleOrchestrator"
import { BattleStateService } from "../battleState/battleState"
import { isValidValue } from "../../utils/objectValidityCheck"
import { BattleSquaddieTeamService } from "../battleSquaddieTeam"
import { BattleActionDecisionStepService } from "../actionDecision/battleActionDecisionStep"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { BattleActionService } from "../history/battleAction/battleAction"
import { BattleActionRecorderService } from "../history/battleAction/battleActionRecorder"
import { ResourceHandler } from "../../resource/resourceHandler"

export class PlayerHudController implements BattleOrchestratorComponent {
    hasCompleted(_gameEngineState: GameEngineState): boolean {
        return true
    }

    keyEventHappened(
        _gameEngineState: GameEngineState,
        _event: OrchestratorComponentKeyEvent
    ): void {
        // Required by inheritance
    }

    mouseEventHappened(
        _gameEngineState: GameEngineState,
        _event: OrchestratorComponentMouseEvent
    ): void {
        // Required by inheritance
    }

    recommendStateChanges(
        gameEngineState: GameEngineState
    ): BattleOrchestratorChanges | undefined {
        const actionBuilderState =
            gameEngineState.battleOrchestratorState.battleState
                .battleActionDecisionStep

        const battleActionAnimationQueueIsEmpty =
            BattleActionRecorderService.isAnimationQueueEmpty(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder
            )

        const battleActionHasAnimated =
            !battleActionAnimationQueueIsEmpty &&
            BattleActionService.isAnimationComplete(
                BattleActionRecorderService.peekAtAnimationQueue(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder
                )
            )

        if (
            !playerCanControlAtLeastOneSquaddie(gameEngineState) &&
            (BattleActionDecisionStepService.isSquaddieActionRecordNotSet(
                actionBuilderState
            ) ||
                battleActionAnimationQueueIsEmpty ||
                battleActionHasAnimated)
        ) {
            return {
                nextMode: BattleOrchestratorMode.COMPUTER_SQUADDIE_SELECTOR,
            }
        }

        if (
            !BattleActionDecisionStepService.isActorSet(actionBuilderState) ||
            !BattleActionDecisionStepService.isActionSet(actionBuilderState)
        ) {
            return {
                nextMode: BattleOrchestratorMode.PLAYER_SQUADDIE_SELECTOR,
            }
        }

        if (actionBuilderState.action.endTurn) {
            return {
                nextMode: BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP,
            }
        }

        if (actionBuilderState.action.movement) {
            return {
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
                    nextMode:
                        BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE,
                }
            }

            if (
                BattleActionDecisionStepService.isTargetConsidered(
                    actionBuilderState
                )
            ) {
                return {
                    nextMode: BattleOrchestratorMode.PLAYER_ACTION_CONFIRM,
                }
            }

            return {
                nextMode: BattleOrchestratorMode.PLAYER_SQUADDIE_TARGET,
            }
        }

        return {
            nextMode: undefined,
        }
    }

    reset(_gameEngineState: GameEngineState): void {
        // Required by inheritance
    }

    uiControlSettings(_gameEngineState: GameEngineState): UIControlSettings {
        return undefined
    }

    update(_param: {
        gameEngineState: GameEngineState
        graphicsContext: GraphicsBuffer
        resourceHandler: ResourceHandler
    }): void {
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
