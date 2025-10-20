import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent,
} from "../orchestrator/battleOrchestratorComponent"
import { BattleUISettings, BattleUISettingsService } from "../orchestrator/uiSettings/uiSettings"
import { BattleOrchestratorMode } from "../orchestrator/battleOrchestrator"
import { BattleStateService } from "../battleState/battleState"
import { isValidValue } from "../../utils/objectValidityCheck"
import { BattleSquaddieTeamService } from "../battleSquaddieTeam"
import { BattleActionDecisionStepService } from "../actionDecision/battleActionDecisionStep"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { BattleActionService } from "../history/battleAction/battleAction"
import { BattleActionRecorderService } from "../history/battleAction/battleActionRecorder"
import { ResourceHandler } from "../../resource/resourceHandler"
import { GameEngineState } from "../../gameEngine/gameEngineState/gameEngineState"

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

        const peek = BattleActionRecorderService.peekAtAnimationQueue(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder
        )

        const battleActionHasAnimated =
            !battleActionAnimationQueueIsEmpty &&
            peek != undefined &&
            BattleActionService.isAnimationComplete(peek)

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

        if (actionBuilderState.action?.endTurn) {
            return {
                nextMode: BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP,
            }
        }

        if (actionBuilderState.action?.movement) {
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

            return {
                nextMode: BattleOrchestratorMode.PLAYER_ACTION_TARGET_SELECT,
            }
        }

        return {
            nextMode: undefined,
        }
    }

    reset(_gameEngineState: GameEngineState): void {
        // Required by inheritance
    }

    uiControlSettings(
        _gameEngineState: GameEngineState
    ): BattleUISettings {
        return BattleUISettingsService.new({})
    }

    update(_param: {
        gameEngineState: GameEngineState
        graphicsContext: GraphicsBuffer
        resourceHandler: ResourceHandler | undefined
    }): void {
        // Required by inheritance
    }
}

const playerCanControlAtLeastOneSquaddie = (
    gameEngineState: GameEngineState
): boolean => {
    if (gameEngineState.repository == undefined) return false
    const currentTeam = BattleStateService.getCurrentTeam(
        gameEngineState.battleOrchestratorState.battleState,
        gameEngineState.repository
    )
    if (!isValidValue(currentTeam) || currentTeam == undefined) {
        return false
    }
    return BattleSquaddieTeamService.canPlayerControlAnySquaddieOnThisTeamRightNow(
        currentTeam,
        gameEngineState.repository
    )
}
