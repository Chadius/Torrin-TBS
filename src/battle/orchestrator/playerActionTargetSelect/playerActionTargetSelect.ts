import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent,
} from "../battleOrchestratorComponent"
import { GameEngineState } from "../../../gameEngine/gameEngine"
import { ResourceHandler } from "../../../resource/resourceHandler"
import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"
import { UIControlSettings } from "../uiControlSettings"
import { BattleOrchestratorMode } from "../battleOrchestrator"
import {
    PlayerActionTargetContextService,
    PlayerActionTargetStateEnum,
    PlayerActionTargetStateMachine,
    PlayerActionTargetStateMachineInfoByState,
    PlayerActionTargetStateMachineInfoByTransition,
} from "./stateMachine"
import { StateMachineDataService } from "../../../utils/stateMachine/stateMachineData/stateMachineData"

export class PlayerActionTargetSelect implements BattleOrchestratorComponent {
    stateMachine: PlayerActionTargetStateMachine

    update({
        gameEngineState,
        graphicsContext,
        resourceHandler,
    }: {
        gameEngineState: GameEngineState
        graphicsContext: GraphicsBuffer
        resourceHandler: ResourceHandler
    }): void {
        this.lazyInitializeStateMachine(gameEngineState)
        this.updateStateMachine()
    }

    updateStateMachine() {
        this.stateMachine.updateUntil({
            stopPredicate: (stateMachine: PlayerActionTargetStateMachine) =>
                stateMachine.currentState ==
                PlayerActionTargetStateEnum.FINISHED,
        })
    }

    uiControlSettings(gameEngineState: GameEngineState): UIControlSettings {
        return new UIControlSettings({})
    }

    mouseEventHappened(
        _gameEngineState: GameEngineState,
        _event: OrchestratorComponentMouseEvent
    ): void {
        // required by implements
    }

    keyEventHappened(
        _gameEngineState: GameEngineState,
        _event: OrchestratorComponentKeyEvent
    ): void {
        // required by implements
    }

    hasCompleted(_gameEngineState: GameEngineState): boolean {
        return (
            this.stateMachine?.currentState ==
            PlayerActionTargetStateEnum.FINISHED
        )
    }

    recommendStateChanges(
        _gameEngineState: GameEngineState
    ): BattleOrchestratorChanges {
        if (this.stateMachine.worldData.cancelActionTarget) {
            return {
                nextMode: BattleOrchestratorMode.PLAYER_HUD_CONTROLLER,
            }
        }

        return {
            nextMode: BattleOrchestratorMode.PLAYER_SQUADDIE_TARGET,
        }
    }

    reset(_gameEngineState: GameEngineState): void {
        this.stateMachine = undefined
    }

    lazyInitializeStateMachine(gameEngineState: GameEngineState) {
        if (this.stateMachine) return

        const context = PlayerActionTargetContextService.new({
            objectRepository: gameEngineState.repository,
            missionMap:
                gameEngineState.battleOrchestratorState.battleState.missionMap,
            battleActionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep,
            messageBoard: gameEngineState.messageBoard,
            campaignResources: gameEngineState.campaign.resources,
        })

        this.stateMachine = new PlayerActionTargetStateMachine({
            id: "PlayerActionTargetStateMachine",
            context: context,
            stateMachineData: StateMachineDataService.new({
                initialState: PlayerActionTargetStateEnum.INITIALIZED,
                infoByState: PlayerActionTargetStateMachineInfoByState,
                infoByTransition:
                    PlayerActionTargetStateMachineInfoByTransition,
            }),
        })
    }
}
