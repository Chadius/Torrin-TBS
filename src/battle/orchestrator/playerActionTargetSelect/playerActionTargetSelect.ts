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
    PlayerActionTargetStateEnum,
    PlayerActionTargetStateMachine,
    PlayerActionTargetStateMachineInfoByState,
    PlayerActionTargetStateMachineInfoByTransition,
} from "./stateMachine"
import { StateMachineDataService } from "../../../utils/stateMachine/stateMachineData/stateMachineData"
import {
    PlayerActionTargetContextService,
    PlayerActionTargetStateMachineContext,
} from "./playerActionTargetStateMachineContext"
import { PlayerActionTargetSelectViewController } from "./viewController"
import { ComponentDataBlob } from "../../../utils/dataBlob/componentDataBlob"
import { PlayerActionTargetStateMachineLayout } from "./playerActionTargetStateMachineLayout"
import { PlayerActionTargetStateMachineUIObjects } from "./playerActionTargetStateMachineUIObjects"
import { BattleCamera } from "../../battleCamera"

export class PlayerActionTargetSelect implements BattleOrchestratorComponent {
    stateMachine: PlayerActionTargetStateMachine
    viewController: PlayerActionTargetSelectViewController
    context: PlayerActionTargetStateMachineContext

    update({
        gameEngineState,
        graphicsContext,
    }: {
        gameEngineState: GameEngineState
        graphicsContext: GraphicsBuffer
        resourceHandler: ResourceHandler
    }): void {
        this.lazyInitializeContext(gameEngineState)
        this.lazyInitializeStateMachine()
        this.lazyInitializeViewController()
        this.updateStateMachine()

        if (!this.context.externalFlags.useLegacySelector) {
            this.updateViewController({
                camera: gameEngineState.battleOrchestratorState.battleState
                    .camera,
                graphicsContext,
            })
            this.connectStateMachineWithViewController()
        }
    }

    updateStateMachine() {
        let stateMachineWaitingForPlayerConfirmCount = 0
        this.stateMachine.updateUntil({
            stopPredicate: (stateMachine: PlayerActionTargetStateMachine) => {
                if (
                    stateMachine.currentState ==
                    PlayerActionTargetStateEnum.FINISHED
                )
                    return true
                if (
                    stateMachine.currentState ==
                    PlayerActionTargetStateEnum.WAITING_FOR_PLAYER_CONFIRM
                )
                    stateMachineWaitingForPlayerConfirmCount += 1
                return stateMachineWaitingForPlayerConfirmCount > 1
            },
        })
    }

    updateViewController({
        camera,
        graphicsContext,
    }: {
        camera: BattleCamera
        graphicsContext: GraphicsBuffer
    }) {
        this.viewController.draw({
            camera,
            graphicsContext,
        })
    }

    uiControlSettings(gameEngineState: GameEngineState): UIControlSettings {
        return new UIControlSettings({})
    }

    mouseEventHappened(
        _gameEngineState: GameEngineState,
        event: OrchestratorComponentMouseEvent
    ): void {
        this.stateMachine?.acceptPlayerInput(event)
    }

    keyEventHappened(
        _gameEngineState: GameEngineState,
        event: OrchestratorComponentKeyEvent
    ): void {
        this.stateMachine?.acceptPlayerInput(event)
    }

    hasCompleted(_gameEngineState: GameEngineState): boolean {
        return (
            this.stateMachine?.context.externalFlags.finished ||
            this.stateMachine?.context.externalFlags.useLegacySelector ||
            this.stateMachine?.context.externalFlags.cancelActionSelection
        )
    }

    recommendStateChanges(
        _gameEngineState: GameEngineState
    ): BattleOrchestratorChanges {
        if (this.stateMachine?.context.externalFlags.useLegacySelector) {
            return { nextMode: BattleOrchestratorMode.PLAYER_SQUADDIE_TARGET }
        }
        return {
            nextMode: BattleOrchestratorMode.PLAYER_HUD_CONTROLLER,
        }
    }

    reset(_gameEngineState: GameEngineState): void {
        this.stateMachine = undefined
        this.viewController = undefined
        this.context = undefined
    }

    lazyInitializeStateMachine() {
        if (this.stateMachine) return

        this.stateMachine = new PlayerActionTargetStateMachine({
            id: "PlayerActionTargetStateMachine",
            context: this.context,
            stateMachineData: StateMachineDataService.new({
                initialState: PlayerActionTargetStateEnum.INITIALIZED,
                infoByState: PlayerActionTargetStateMachineInfoByState,
                infoByTransition:
                    PlayerActionTargetStateMachineInfoByTransition,
            }),
        })
    }

    lazyInitializeViewController() {
        if (this.viewController) return
        const componentData = new ComponentDataBlob<
            PlayerActionTargetStateMachineLayout,
            PlayerActionTargetStateMachineContext,
            PlayerActionTargetStateMachineUIObjects
        >()
        componentData.setContext(this.context)
        this.viewController = new PlayerActionTargetSelectViewController(
            componentData
        )
    }

    lazyInitializeContext(gameEngineState: GameEngineState) {
        if (this.context) return
        this.context = PlayerActionTargetContextService.new({
            objectRepository: gameEngineState.repository,
            missionMap:
                gameEngineState.battleOrchestratorState.battleState.missionMap,
            battleActionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep,
            messageBoard: gameEngineState.messageBoard,
            campaignResources: gameEngineState.campaign.resources,
            summaryHUDState:
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState,
            battleActionRecorder:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder,
            numberGenerator:
                gameEngineState.battleOrchestratorState.numberGenerator,
            missionStatistics:
                gameEngineState.battleOrchestratorState.battleState
                    .missionStatistics,
            playerInputState: gameEngineState.playerInputState,
            playerConsideredActions:
                gameEngineState.battleOrchestratorState.battleState
                    .playerConsideredActions,
            playerDecisionHUD:
                gameEngineState.battleOrchestratorState.playerDecisionHUD,
            playerCommandState:
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.playerCommandState,
        })
    }

    private connectStateMachineWithViewController() {
        this.stateMachine.uiObjects = this.viewController.getUIObjects()
    }
}
