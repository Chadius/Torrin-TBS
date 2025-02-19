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
import { FileAccessHUDService } from "../hud/fileAccess/fileAccessHUD"
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
import { SummaryHUDStateService } from "../hud/summary/summaryHUD"
import { PlayerCommandSelection } from "../hud/playerCommand/playerCommandHUD"
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
import { BattleStateService } from "../battleState/battleState"
import { isValidValue } from "../../utils/validityCheck"
import { BattleSquaddieTeamService } from "../battleSquaddieTeam"
import { BattleActionDecisionStepService } from "../actionDecision/battleActionDecisionStep"

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
                mouseButton,
                gameEngineState,
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

    uiControlSettings(_gameEngineState: GameEngineState): UIControlSettings {
        return new UIControlSettings({
            scrollCamera: true,
            displayMap: true,
            pauseTimer: false,
            displayPlayerHUD: true,
        })
    }

    update({
        gameEngineState,
    }: {
        gameEngineState: GameEngineState
        graphicsContext: GraphicsBuffer
        resourceHandler: ResourceHandler
    }): void {
        if (this.readyToAutomaticallySelectASquaddie(gameEngineState)) {
            this.selectFirstPlayableSquaddie(gameEngineState)
        }
    }

    private readyToAutomaticallySelectASquaddie(
        gameEngineState: GameEngineState
    ) {
        if (
            gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState ||
            gameEngineState.battleOrchestratorState.battleState.camera.isPanning()
        ) {
            return false
        }

        if (
            BattleActionDecisionStepService.getAction(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep
            )
        )
            return false

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

    private selectFirstPlayableSquaddie(gameEngineState: GameEngineState) {
        const currentTeam = BattleStateService.getCurrentTeam(
            gameEngineState.battleOrchestratorState.battleState,
            gameEngineState.repository
        )
        const battleSquaddieIds =
            BattleSquaddieTeamService.getBattleSquaddiesThatCanAct(
                currentTeam,
                gameEngineState.repository
            )
        gameEngineState.messageBoard.sendMessage({
            type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
            gameEngineState,
            battleSquaddieSelectedId: battleSquaddieIds[0],
        })
    }

    recommendStateChanges(
        _gameEngineState: GameEngineState
    ): BattleOrchestratorChanges | undefined {
        let nextMode: BattleOrchestratorMode = this.recommendedNextMode

        return {
            nextMode,
        }
    }

    reset(_gameEngineState: GameEngineState) {
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
