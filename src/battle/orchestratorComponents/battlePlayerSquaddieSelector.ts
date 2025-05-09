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
    MouseConfigService,
    MousePress,
    MouseRelease,
    ScreenLocation,
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
import { isValidValue } from "../../utils/objectValidityCheck"
import { BattleSquaddieTeamService } from "../battleSquaddieTeam"
import { BattleActionDecisionStepService } from "../actionDecision/battleActionDecisionStep"
import { DRAW_SQUADDIE_ICON_ON_MAP_LAYOUT } from "../animation/drawSquaddieIconOnMap/drawSquaddieIconOnMap"
import { ObjectRepositoryService } from "../objectRepository"
import { ImageUI } from "../../ui/imageUI/imageUI"

export class BattlePlayerSquaddieSelector
    implements BattleOrchestratorComponent, MessageBoardListener
{
    messageBoardListenerId: string
    componentCompleted: boolean
    recommendedNextMode: BattleOrchestratorMode

    highlightedSquaddie: {
        battleSquaddieId: string
        mapIcon: ImageUI
    }

    constructor() {
        this.messageBoardListenerId = "BattlePlayerSquaddieSelectorListener"
        this.highlightedSquaddie = {
            battleSquaddieId: undefined,
            mapIcon: undefined,
        }
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
        if (event.eventType === OrchestratorComponentMouseEventType.RELEASE) {
            this.mouseReleased({
                mouseRelease: event.mouseRelease,
                gameEngineState,
            })
        }

        if (event.eventType === OrchestratorComponentMouseEventType.PRESS) {
            this.mousePressed({
                mousePress: event.mousePress,
                gameEngineState,
            })
        }

        if (event.eventType === OrchestratorComponentMouseEventType.LOCATION) {
            this.mouseMoved(gameEngineState, event.mouseLocation)
        }
    }

    mousePressed({
        gameEngineState,
        mousePress,
    }: {
        gameEngineState: GameEngineState
        mousePress: MousePress
    }): void {
        FileAccessHUDService.mousePressed({
            fileAccessHUD:
                gameEngineState.battleOrchestratorState.battleHUD.fileAccessHUD,
            mousePress,
            fileState: gameEngineState.fileState,
            messageBoard: gameEngineState.messageBoard,
        })
    }

    mouseReleased({
        gameEngineState,
        mouseRelease,
    }: {
        gameEngineState: GameEngineState
        mouseRelease: MouseRelease
    }): void {
        const fileAccessHudWasClicked = FileAccessHUDService.mouseReleased({
            fileAccessHUD:
                gameEngineState.battleOrchestratorState.battleHUD.fileAccessHUD,
            mouseRelease,
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
            SummaryHUDStateService.mouseReleased({
                mouseRelease,
                gameEngineState,
                summaryHUDState,
            })

        if (summaryHUDState?.playerCommandState) {
            const { didUserClickOnSummaryHUD } = processPlayerCommandSelection({
                playerCommandSelection,
                gameEngineState,
                mouseClick: MouseConfigService.newMouseClick({
                    ...mouseRelease,
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
                    ...mouseRelease,
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
        mouseLocation: ScreenLocation
    ): void {
        FileAccessHUDService.mouseMoved({
            fileAccessHUD:
                gameEngineState.battleOrchestratorState.battleHUD.fileAccessHUD,
            mouseLocation,
        })

        const context = PlayerSelectionService.calculateContext(
            PlayerSelectionContextCalculationArgsService.new({
                gameEngineState,
                mouseMovement: mouseLocation,
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
            mouseLocation,
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
        this.highlightActorSquaddie(gameEngineState)
    }

    private highlightActorSquaddie(gameEngineState: GameEngineState) {
        if (
            !BattleActionDecisionStepService.isActorSet(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep
            )
        ) {
            return
        }

        const battleSquaddieId = BattleActionDecisionStepService.getActor(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionDecisionStep
        ).battleSquaddieId

        if (this.highlightedSquaddie.battleSquaddieId == battleSquaddieId)
            return

        const mapIcon = ObjectRepositoryService.getImageUIByBattleSquaddieId({
            repository: gameEngineState.repository,
            battleSquaddieId: battleSquaddieId,
            throwErrorIfNotFound: false,
        })

        if (!mapIcon) return

        mapIcon.setPulseColor(
            DRAW_SQUADDIE_ICON_ON_MAP_LAYOUT.actorSquaddie.pulseColorForMapIcon
        )

        this.highlightedSquaddie.battleSquaddieId = battleSquaddieId
        this.highlightedSquaddie.mapIcon = mapIcon
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
        this.highlightedSquaddie.mapIcon?.removePulseColor()
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
    mouseClick: MousePress
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
