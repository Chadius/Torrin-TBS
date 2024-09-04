import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentKeyEventType,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType,
} from "../orchestrator/battleOrchestratorComponent"
import {
    BattleSquaddieTeam,
    BattleSquaddieTeamService,
} from "../battleSquaddieTeam"
import { BattleOrchestratorMode } from "../orchestrator/battleOrchestrator"
import { UIControlSettings } from "../orchestrator/uiControlSettings"
import { BattleStateService } from "../orchestrator/battleState"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { isValidValue } from "../../utils/validityCheck"
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
import { KeyButtonName, KeyWasPressed } from "../../utils/keyboardConfig"
import {
    PlayerSelectionContextCalculationArgsService,
    PlayerSelectionService,
} from "../playerSelectionService/playerSelectionService"
import { PlayerSelectionChanges } from "../playerSelectionService/playerSelectionChanges"
import { PlayerSelectionContext } from "../playerSelectionService/playerSelectionContext"
import { MessageBoardListener } from "../../message/messageBoardListener"

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
        if (!this.playerCanControlAtLeastOneSquaddie(gameEngineState)) {
            return true
        }

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
            })
        )
        PlayerSelectionService.applyContextToGetChanges({
            gameEngineState,
            context,
        })
    }

    keyEventHappened(
        gameEngineState: GameEngineState,
        event: OrchestratorComponentKeyEvent
    ): void {
        if (event.eventType !== OrchestratorComponentKeyEventType.PRESSED) {
            return
        }

        if (KeyWasPressed(KeyButtonName.NEXT_SQUADDIE, event.keyCode)) {
            const context = PlayerSelectionService.calculateContext(
                PlayerSelectionContextCalculationArgsService.new({
                    gameEngineState,
                    keyPress: {
                        keyButtonName: KeyButtonName.NEXT_SQUADDIE,
                    },
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

    update(
        gameEngineState: GameEngineState,
        graphicsContext: GraphicsBuffer
    ): void {
        if (
            !this.playerCanControlAnySquaddiesOnTheCurrentTeam(gameEngineState)
        ) {
            return
        }
    }

    recommendStateChanges(
        gameEngineState: GameEngineState
    ): BattleOrchestratorChanges | undefined {
        let nextMode: BattleOrchestratorMode = this.recommendedNextMode

        if (!this.playerCanControlAtLeastOneSquaddie(gameEngineState)) {
            nextMode = BattleOrchestratorMode.COMPUTER_SQUADDIE_SELECTOR
        }

        return {
            displayMap: true,
            nextMode,
        }
    }

    reset(gameEngineState: GameEngineState) {
        this.componentCompleted = false
        this.recommendedNextMode = BattleOrchestratorMode.UNKNOWN
    }

    private playerCanControlAnySquaddiesOnTheCurrentTeam(
        gameEngineState: GameEngineState
    ): boolean {
        const currentTeam: BattleSquaddieTeam =
            BattleStateService.getCurrentTeam(
                gameEngineState.battleOrchestratorState.battleState,
                gameEngineState.repository
            )
        return (
            BattleSquaddieTeamService.hasAnActingSquaddie(
                currentTeam,
                gameEngineState.repository
            ) &&
            BattleSquaddieTeamService.canPlayerControlAnySquaddieOnThisTeamRightNow(
                currentTeam,
                gameEngineState.repository
            )
        )
    }

    private playerCanControlAtLeastOneSquaddie(
        state: GameEngineState
    ): boolean {
        const currentTeam = BattleStateService.getCurrentTeam(
            state.battleOrchestratorState.battleState,
            state.repository
        )
        if (!isValidValue(currentTeam)) {
            return false
        }
        return BattleSquaddieTeamService.canPlayerControlAnySquaddieOnThisTeamRightNow(
            currentTeam,
            state.repository
        )
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
