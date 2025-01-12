import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentKeyEventType,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType,
} from "../orchestrator/battleOrchestratorComponent"
import { BattleOrchestratorMode } from "../orchestrator/battleOrchestrator"
import { UIControlSettings } from "../orchestrator/uiControlSettings"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { FileAccessHUDService } from "../hud/fileAccessHUD"
import {
    MouseButton,
    MouseClick,
    MouseClickService,
} from "../../utils/mouseConfig"
import {
    MessageBoardMessage,
    MessageBoardMessageType,
} from "../../message/messageBoardMessage"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { SummaryHUDStateService } from "../hud/summaryHUD"
import { PlayerCommandSelection } from "../hud/playerCommandHUD"
import {
    PlayerSelectionContextCalculationArgsService,
    PlayerSelectionService,
} from "../playerSelectionService/playerSelectionService"
import { PlayerSelectionChanges } from "../playerSelectionService/playerSelectionChanges"
import { PlayerSelectionContext } from "../playerSelectionService/playerSelectionContext"
import { MessageBoardListener } from "../../message/messageBoardListener"
import { ResourceHandler } from "../../resource/resourceHandler"
import {
    PlayerInputAction,
    PlayerInputStateService,
} from "../../ui/playerInput/playerInputState"

export class BattlePlayerSquaddieSelector
    implements BattleOrchestratorComponent, MessageBoardListener
{
    messageBoardListenerId: string
    componentCompleted: boolean
    recommendedNextMode: BattleOrchestratorMode

    constructor() {
        this.messageBoardListenerId = "BattlePlayerSquaddieSelectorListener"
    }

    hasCompleted(gameEngineState: GameEngineState): boolean {
        const cameraIsNotPanning =
            !gameEngineState.battleOrchestratorState.battleState.camera.isPanning()
        return this.componentCompleted && cameraIsNotPanning
    }

    mouseEventHappened(
        gameEngineState: GameEngineState,
        event: OrchestratorComponentMouseEvent
    ): void {
        if (event.eventType === OrchestratorComponentMouseEventType.CLICKED) {
            this.mouseClicked({
                mouseX: event.mouseX,
                mouseY: event.mouseY,
                mouseButton: event.mouseButton,
                gameEngineState,
            })
        }

        if (event.eventType === OrchestratorComponentMouseEventType.MOVED) {
            this.mouseMoved(gameEngineState, event.mouseX, event.mouseY)
        }
    }

    mouseClicked({
        gameEngineState,
        mouseX,
        mouseY,
        mouseButton,
    }: {
        gameEngineState: GameEngineState
        mouseX: number
        mouseY: number
        mouseButton: MouseButton
    }): void {
        const fileAccessHudWasClicked = FileAccessHUDService.mouseClicked({
            fileAccessHUD:
                gameEngineState.battleOrchestratorState.battleHUD.fileAccessHUD,
            mouseX,
            mouseY,
            mouseButton,
            fileState: gameEngineState.fileState,
            messageBoard: gameEngineState.messageBoard,
        })
        if (fileAccessHudWasClicked) {
            return
        }

        const summaryHUDState =
            gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState

        const playerCommandSelection: PlayerCommandSelection =
            SummaryHUDStateService.mouseClicked({
                mouseX,
                mouseY,
                gameEngineState,
                mouseButton,
                summaryHUDState,
            })

        if (summaryHUDState?.playerCommandState) {
            const { didUserClickOnSummaryHUD } = processPlayerCommandSelection({
                playerCommandSelection,
                gameEngineState,
                mouseClick: MouseClickService.new({
                    x: mouseX,
                    y: mouseY,
                    button: mouseButton,
                }),
            })

            if (didUserClickOnSummaryHUD) {
                return
            }
        }

        const context = PlayerSelectionService.calculateContext(
            PlayerSelectionContextCalculationArgsService.new({
                gameEngineState,
                mouseClick: {
                    x: mouseX,
                    y: mouseY,
                    button: mouseButton,
                },
                playerInputActions: [],
            })
        )
        PlayerSelectionService.applyContextToGetChanges({
            gameEngineState,
            context,
        })
    }

    mouseMoved(
        gameEngineState: GameEngineState,
        mouseX: number,
        mouseY: number
    ): void {
        const context = PlayerSelectionService.calculateContext(
            PlayerSelectionContextCalculationArgsService.new({
                gameEngineState,
                mouseMovement: {
                    x: mouseX,
                    y: mouseY,
                },
                playerInputActions: [],
            })
        )
        PlayerSelectionService.applyContextToGetChanges({
            gameEngineState,
            context,
        })

        if (
            !gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState
        ) {
            return
        }

        SummaryHUDStateService.mouseMoved({
            summaryHUDState:
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState,
            mouseY,
            mouseX,
            gameEngineState,
        })
    }

    keyEventHappened(
        gameEngineState: GameEngineState,
        event: OrchestratorComponentKeyEvent
    ): void {
        if (event.eventType !== OrchestratorComponentKeyEventType.PRESSED) {
            return
        }
        const actions: PlayerInputAction[] =
            PlayerInputStateService.getActionsForPressedKey(
                gameEngineState.playerInputState,
                event.keyCode
            )
        if (actions.includes(PlayerInputAction.NEXT)) {
            const context = PlayerSelectionService.calculateContext(
                PlayerSelectionContextCalculationArgsService.new({
                    gameEngineState,
                    playerInputActions: [PlayerInputAction.NEXT],
                })
            )
            PlayerSelectionService.applyContextToGetChanges({
                gameEngineState,
                context,
            })
        }
    }

    uiControlSettings(state: GameEngineState): UIControlSettings {
        return new UIControlSettings({
            scrollCamera: true,
            displayMap: true,
            pauseTimer: false,
        })
    }

    update({
        gameEngineState,
        graphicsContext,
        resourceHandler,
    }: {
        gameEngineState: GameEngineState
        graphicsContext: GraphicsBuffer
        resourceHandler: ResourceHandler
    }): void {
        // Required by inheritance
    }

    recommendStateChanges(
        gameEngineState: GameEngineState
    ): BattleOrchestratorChanges | undefined {
        let nextMode: BattleOrchestratorMode = this.recommendedNextMode

        return {
            displayMap: true,
            nextMode,
        }
    }

    reset(gameEngineState: GameEngineState) {
        this.componentCompleted = false
        this.recommendedNextMode = BattleOrchestratorMode.UNKNOWN
    }

    receiveMessage(message: MessageBoardMessage): void {
        if (
            message.type !==
            MessageBoardMessageType.PLAYER_CONFIRMS_DECISION_STEP_ACTOR
        ) {
            return
        }
        this.componentCompleted = true
        this.recommendedNextMode = message.recommendedMode
    }
}

const processPlayerCommandSelection = ({
    gameEngineState,
    playerCommandSelection,
    mouseClick,
}: {
    gameEngineState: GameEngineState
    playerCommandSelection: PlayerCommandSelection
    mouseClick: MouseClick
}): {
    didUserClickOnSummaryHUD: boolean
    changes: PlayerSelectionChanges
} => {
    let changes: PlayerSelectionChanges
    let context: PlayerSelectionContext
    switch (playerCommandSelection) {
        case PlayerCommandSelection.PLAYER_COMMAND_SELECTION_END_TURN:
            context = PlayerSelectionService.calculateContext(
                PlayerSelectionContextCalculationArgsService.new({
                    gameEngineState,
                    mouseClick,
                    endTurnSelected: true,
                    playerInputActions: [],
                })
            )
            changes = PlayerSelectionService.applyContextToGetChanges({
                gameEngineState,
                context,
            })
            break
        case PlayerCommandSelection.PLAYER_COMMAND_SELECTION_ACTION:
            context = PlayerSelectionService.calculateContext(
                PlayerSelectionContextCalculationArgsService.new({
                    gameEngineState,
                    mouseClick,
                    actionTemplateId:
                        gameEngineState.battleOrchestratorState.battleHUDState
                            .summaryHUDState.playerCommandState
                            .selectedActionTemplateId,
                    playerInputActions: [],
                })
            )
            changes = PlayerSelectionService.applyContextToGetChanges({
                gameEngineState,
                context,
            })
            break
    }

    const didUserClickOnSummaryHUD = [
        PlayerCommandSelection.PLAYER_COMMAND_SELECTION_MOVE,
        PlayerCommandSelection.PLAYER_COMMAND_SELECTION_END_TURN,
        PlayerCommandSelection.PLAYER_COMMAND_SELECTION_ACTION,
    ].includes(playerCommandSelection)

    return {
        didUserClickOnSummaryHUD,
        changes,
    }
}
