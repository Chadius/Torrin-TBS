import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent
} from "../orchestrator/battleOrchestratorComponent";
import {GameEngineState} from "../../gameEngine/gameEngine";
import {UIControlSettings} from "../orchestrator/uiControlSettings";
import {GraphicsContext} from "../../utils/graphics/graphicsContext";
import {BattleOrchestratorMode} from "../orchestrator/battleOrchestrator";
import {BattleStateService} from "../orchestrator/battleState";
import {isValidValue} from "../../utils/validityCheck";
import {BattleSquaddieTeamService} from "../battleSquaddieTeam";
import {PlayerBattleActionBuilderStateService} from "../actionBuilder/playerBattleActionBuilderState";

export class PlayerHudController implements BattleOrchestratorComponent {
    hasCompleted(gameEngineState: GameEngineState): boolean {
        return true;
    }

    keyEventHappened(gameEngineState: GameEngineState, event: OrchestratorComponentKeyEvent): void {
    }

    mouseEventHappened(gameEngineState: GameEngineState, event: OrchestratorComponentMouseEvent): void {
    }

    recommendStateChanges(gameEngineState: GameEngineState): BattleOrchestratorChanges | undefined {
        const actionBuilderState = gameEngineState.battleOrchestratorState.battleState.playerBattleActionBuilderState;

        if (
            !playerCanControlAtLeastOneSquaddie(gameEngineState)
            && (
                PlayerBattleActionBuilderStateService.isActionBuilderStateNotSet(actionBuilderState)
                || PlayerBattleActionBuilderStateService.isActionComplete(actionBuilderState)
            )
        ) {
            return {
                displayMap: true,
                nextMode: BattleOrchestratorMode.COMPUTER_SQUADDIE_SELECTOR,
            }
        }

        if (
            !PlayerBattleActionBuilderStateService.isActorSet(actionBuilderState)
            || !PlayerBattleActionBuilderStateService.isActionSet(actionBuilderState)
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

        if (isValidValue(actionBuilderState.action.actionTemplate)) {
            if (PlayerBattleActionBuilderStateService.isTargetConfirmed(actionBuilderState)) {
                return {
                    displayMap: true,
                    nextMode: BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE,
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
        if (
            PlayerBattleActionBuilderStateService.isAnimationComplete(
                gameEngineState.battleOrchestratorState.battleState.playerBattleActionBuilderState)
        ) {
            gameEngineState.battleOrchestratorState.battleState.playerBattleActionBuilderState = undefined;
        }
    }

    uiControlSettings(gameEngineState: GameEngineState): UIControlSettings {
        return undefined;
    }

    update(gameEngineState: GameEngineState, graphicsContext: GraphicsContext): void {
    }
}

const playerCanControlAtLeastOneSquaddie = (gameEngineState: GameEngineState): boolean => {
    const currentTeam = BattleStateService.getCurrentTeam(gameEngineState.battleOrchestratorState.battleState, gameEngineState.repository);
    if (!isValidValue(currentTeam)) {
        return false;
    }
    return BattleSquaddieTeamService.canPlayerControlAnySquaddieOnThisTeamRightNow(currentTeam, gameEngineState.repository);
}