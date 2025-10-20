import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent,
} from "../../orchestrator/battleOrchestratorComponent"
import { ResourceHandler } from "../../../resource/resourceHandler"
import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"
import {
    BattleUISettings,
    BattleUISettingsService,
} from "../../orchestrator/uiSettings/uiSettings"
import { BattleOrchestratorMode } from "../../orchestrator/battleOrchestrator"
import {
    PlayerActionTargetActionType,
    PlayerActionTargetStateEnum,
    PlayerActionTargetStateMachine,
    PlayerActionTargetStateMachineInfoByState,
    PlayerActionTargetStateMachineInfoByTransition,
    PlayerActionTargetTransitionType,
    TPlayerActionTargetState,
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
import { StateMachine } from "../../../utils/stateMachine/stateMachine"
import { GameEngineState } from "../../../gameEngine/gameEngineState/gameEngineState"

export class PlayerActionTargetSelect implements BattleOrchestratorComponent {
    stateMachine: PlayerActionTargetStateMachine | undefined
    viewController: PlayerActionTargetSelectViewController | undefined
    context: PlayerActionTargetStateMachineContext | undefined

    update({ gameEngineState }: { gameEngineState: GameEngineState }): void {
        this.lazyInitializeContext(gameEngineState)
        this.lazyInitializeStateMachine()
        this.lazyInitializeViewController()
        this.updateStateMachine()
        this.connectStateMachineWithViewController()
    }

    updateStateMachine() {
        let stateMachineWaitingForPlayerConfirmCount = 0
        this.stateMachine?.updateUntil({
            stopPredicate: (
                stateMachine: StateMachine<
                    TPlayerActionTargetState,
                    PlayerActionTargetTransitionType,
                    PlayerActionTargetActionType,
                    PlayerActionTargetStateMachineContext
                >
            ) => {
                if (
                    stateMachine.context.externalFlags.actionConfirmed ||
                    stateMachine.context.externalFlags.cancelActionSelection
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

    uiControlSettings(_: GameEngineState): BattleUISettings {
        return BattleUISettingsService.new({})
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
            (this.stateMachine?.context.externalFlags.actionConfirmed ||
                this.stateMachine?.context.externalFlags
                    .cancelActionSelection) ??
            false
        )
    }

    recommendStateChanges(
        _gameEngineState: GameEngineState
    ): BattleOrchestratorChanges {
        return {
            nextMode: BattleOrchestratorMode.PLAYER_HUD_CONTROLLER,
        }
    }

    reset(_gameEngineState: GameEngineState): void {
        this.viewController?.cleanUp()

        this.stateMachine = undefined
        this.viewController = undefined
        this.context = undefined
    }

    lazyInitializeStateMachine() {
        if (this.stateMachine) return
        if (this.context == undefined) return

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
        if (this.context == undefined) return

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
            camera: gameEngineState.battleOrchestratorState.battleState.camera,
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
                    .summaryHUDState?.playerCommandState,
            squaddieAllMovementCache:
                gameEngineState.battleOrchestratorState.cache
                    .searchResultsCache,
            challengeModifierSetting:
                gameEngineState.battleOrchestratorState.battleState
                    .challengeModifierSetting,
        })
    }

    private connectStateMachineWithViewController() {
        if (this.stateMachine && this.viewController) {
            this.stateMachine.uiObjects = this.viewController.getUIObjects()
        }
    }

    draw({
        gameEngineState,
        graphics,
    }: {
        gameEngineState: GameEngineState
        graphics: GraphicsBuffer
        resourceHandler: ResourceHandler | undefined
    }): void {
        this.viewController?.draw({
            camera: gameEngineState.battleOrchestratorState.battleState.camera,
            graphicsContext: graphics,
        })
    }
}
