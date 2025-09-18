import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentKeyEventType,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType,
} from "../orchestrator/battleOrchestratorComponent"
import {
    BattleOrchestratorMode,
    TBattleOrchestratorMode,
} from "../orchestrator/battleOrchestrator"
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
    MessageBoardMessagePlayerConfirmsDecisionStepActor,
    MessageBoardMessageType,
} from "../../message/messageBoardMessage"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { SummaryHUDStateService } from "../hud/summary/summaryHUD"
import {
    PlayerCommandSelection,
    PlayerCommandStateService,
    TPlayerCommandSelection,
} from "../hud/playerCommand/playerCommandHUD"
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
    TPlayerInputAction,
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
    componentCompleted: boolean | undefined
    recommendedNextMode: TBattleOrchestratorMode | undefined

    highlightedSquaddie: {
        battleSquaddieId: string | undefined
        mapIcon: ImageUI | undefined
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
        return this.componentCompleted == true && cameraIsNotPanning
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
        if (summaryHUDState == undefined) return

        const playerCommandSelection: TPlayerCommandSelection =
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
                playerInputActions: [],
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
        const actions: TPlayerInputAction[] =
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
            return
        }

        if (actions.includes(PlayerInputAction.END_TURN)) {
            processPlayerCommandSelection({
                gameEngineState,
                playerCommandSelection:
                    PlayerCommandSelection.PLAYER_COMMAND_SELECTION_END_TURN,
                playerInputActions: [PlayerInputAction.END_TURN],
            })
            return
        }

        const listIndexActions =
            PlayerInputStateService.filterListIndexActions(actions)
        listIndexActions.forEach((playerInputAction) => {
            if (
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState?.playerCommandState == undefined
            )
                return
            const playerCommandSelection = PlayerCommandStateService.keyPressed(
                {
                    gameEngineState,
                    playerCommandState:
                        gameEngineState.battleOrchestratorState.battleHUDState
                            .summaryHUDState.playerCommandState,
                    playerInputAction: playerInputAction,
                }
            )
            processPlayerCommandSelection({
                gameEngineState,
                playerCommandSelection,
                playerInputActions: [playerInputAction],
            })
        })
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
        resourceHandler: ResourceHandler | undefined
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
        )?.battleSquaddieId

        if (battleSquaddieId == undefined) return
        if (gameEngineState.repository == undefined) return
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

    private selectFirstPlayableSquaddie(gameEngineState: GameEngineState) {
        if (gameEngineState.repository == undefined) return
        const currentTeam = BattleStateService.getCurrentTeam(
            gameEngineState.battleOrchestratorState.battleState,
            gameEngineState.repository
        )
        if (currentTeam == undefined) return
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
        let nextMode = this.recommendedNextMode
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
        this.recommendedNextMode = (
            message as MessageBoardMessagePlayerConfirmsDecisionStepActor
        ).recommendedMode
    }
}

const processPlayerCommandSelection = ({
    gameEngineState,
    playerCommandSelection,
    mouseClick,
    playerInputActions,
}: {
    gameEngineState: GameEngineState
    playerCommandSelection: TPlayerCommandSelection
    mouseClick?: MousePress
    playerInputActions: TPlayerInputAction[]
}): {
    didUserClickOnSummaryHUD: boolean
    changes: PlayerSelectionChanges | undefined
} => {
    let changes = undefined
    let context: PlayerSelectionContext
    switch (playerCommandSelection) {
        case PlayerCommandSelection.PLAYER_COMMAND_SELECTION_END_TURN:
            context = PlayerSelectionService.calculateContext(
                PlayerSelectionContextCalculationArgsService.new({
                    gameEngineState,
                    mouseClick,
                    endTurnSelected: true,
                    playerInputActions,
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
                            .summaryHUDState?.playerCommandState
                            .selectedActionTemplateId,
                    playerInputActions,
                })
            )
            changes = PlayerSelectionService.applyContextToGetChanges({
                gameEngineState,
                context,
            })
            break
    }

    const didUserClickOnSummaryHUD = new Set<TPlayerCommandSelection>([
        PlayerCommandSelection.PLAYER_COMMAND_SELECTION_MOVE,
        PlayerCommandSelection.PLAYER_COMMAND_SELECTION_END_TURN,
        PlayerCommandSelection.PLAYER_COMMAND_SELECTION_ACTION,
    ]).has(playerCommandSelection)

    return {
        didUserClickOnSummaryHUD,
        changes,
    }
}
