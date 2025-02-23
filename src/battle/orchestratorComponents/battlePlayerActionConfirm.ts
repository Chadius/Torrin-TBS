import {
    GOLDEN_RATIO,
    HORIZONTAL_ALIGN,
    VERTICAL_ALIGN,
} from "../../ui/constants"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentKeyEventType,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventRelease,
    OrchestratorComponentMouseEventType,
} from "../orchestrator/battleOrchestratorComponent"
import { UIControlSettings } from "../orchestrator/uiControlSettings"
import { BattleOrchestratorMode } from "../orchestrator/battleOrchestrator"
import { TargetingResultsService } from "../targeting/targetingService"
import { RectArea, RectAreaService } from "../../ui/rectArea"
import { OrchestratorUtilities } from "./orchestratorUtils"
import { Label, LabelService } from "../../ui/label"
import { isValidValue } from "../../utils/validityCheck"
import { MouseButton } from "../../utils/mouseConfig"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import { ResourceHandler } from "../../resource/resourceHandler"
import { PlayerCancelButtonService } from "./commonUI/playerCancelButton"
import {
    PlayerInputAction,
    PlayerInputState,
    PlayerInputStateService,
} from "../../ui/playerInput/playerInputState"

const layout = {
    okButton: {
        left: (ScreenDimensions.SCREEN_WIDTH * 6) / 12,
        right: (ScreenDimensions.SCREEN_WIDTH * 7) / 12,
        text: "OK",
        fontSize: 24,
        bottom:
            ScreenDimensions.SCREEN_HEIGHT -
            (ScreenDimensions.SCREEN_WIDTH / 12) * (GOLDEN_RATIO - 1),
        top:
            ScreenDimensions.SCREEN_HEIGHT -
            (ScreenDimensions.SCREEN_WIDTH / 12) * (2 * GOLDEN_RATIO - 1),
        fillColor: [0, 0, 128],
        strokeColor: [0, 0, 0],
        strokeWeight: 2,
        fontColor: [0, 0, 16],
        textBoxMargin: [0, 0, 0, 0],
        margin: 0,
    },
}

export class BattlePlayerActionConfirm implements BattleOrchestratorComponent {
    private cancelAbility: boolean
    private hasConfirmedAction: boolean
    private confirmButton: Label
    private cancelButton: Label

    constructor() {
        this.resetObject()
    }

    hasCompleted(gameEngineState: GameEngineState): boolean {
        const userWantsADifferentAbility: boolean = this.cancelAbility === true
        const userConfirmedTarget: boolean = this.hasConfirmedAction === true
        return userWantsADifferentAbility || userConfirmedTarget
    }

    mouseEventHappened(
        gameEngineState: GameEngineState,
        mouseEvent: OrchestratorComponentMouseEvent
    ): void {
        if (
            mouseEvent.eventType !== OrchestratorComponentMouseEventType.RELEASE
        ) {
            return
        }

        if (!this.hasConfirmedAction) {
            this.waitingForConfirmation({ gameEngineState, mouseEvent })
        }
    }

    keyEventHappened(
        gameEngineState: GameEngineState,
        keyboardEvent: OrchestratorComponentKeyEvent
    ): void {
        if (
            keyboardEvent.eventType !==
            OrchestratorComponentKeyEventType.PRESSED
        ) {
            return
        }

        if (!this.hasConfirmedAction) {
            this.waitingForConfirmation({ gameEngineState, keyboardEvent })
        }
    }

    uiControlSettings(state: GameEngineState): UIControlSettings {
        return new UIControlSettings({
            scrollCamera: false,
            displayMap: true,
            pauseTimer: false,
            displayPlayerHUD: true,
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
        if (this.hasCompleted(gameEngineState)) {
            return
        }
        LabelService.draw(this.confirmButton, graphicsContext)
        LabelService.draw(this.cancelButton, graphicsContext)
    }

    recommendStateChanges(
        gameEngineState: GameEngineState
    ): BattleOrchestratorChanges | undefined {
        OrchestratorUtilities.generateMessagesIfThePlayerCanActWithANewSquaddie(
            gameEngineState
        )
        if (this.cancelAbility) {
            return {
                nextMode: BattleOrchestratorMode.PLAYER_SQUADDIE_TARGET,
            }
        }
        if (this.hasConfirmedAction) {
            return {
                nextMode: BattleOrchestratorMode.PLAYER_HUD_CONTROLLER,
            }
        }

        return undefined
    }

    reset(gameEngineState: GameEngineState) {
        this.resetObject()
    }

    private waitingForConfirmation({
        gameEngineState,
        mouseEvent,
        keyboardEvent,
    }: {
        gameEngineState: GameEngineState
        mouseEvent?: OrchestratorComponentMouseEventRelease
        keyboardEvent?: OrchestratorComponentKeyEvent
    }) {
        if (
            didUserCancelActionConfirmation({
                mouseEvent,
                keyboardEvent,
                cancelButtonArea: this.cancelButton.rectangle.area,
                playerInputState: gameEngineState.playerInputState,
            })
        ) {
            TargetingResultsService.highlightTargetRange(gameEngineState)
            this.cancelAbility = true
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_CANCELS_TARGET_CONFIRMATION,
                gameEngineState,
            })
            return
        }

        if (
            !didUserConfirmActionConfirmation({
                mouseEvent,
                keyboardEvent,
                confirmButtonArea: this.confirmButton.rectangle.area,
                playerInputState: gameEngineState.playerInputState,
            })
        ) {
            return
        }

        gameEngineState.messageBoard.sendMessage({
            type: MessageBoardMessageType.PLAYER_CONFIRMS_ACTION,
            gameEngineState,
        })
        this.hasConfirmedAction = true
    }

    private resetObject() {
        this.hasConfirmedAction = false
        this.cancelAbility = false

        this.confirmButton = this.createButton({
            ...layout.okButton,
            area: RectAreaService.new({
                left: layout.okButton.left,
                right: layout.okButton.right,
                margin: layout.okButton.margin,
                top: layout.okButton.top,
                bottom: layout.okButton.bottom,
            }),
            buttonText: layout.okButton.text,
            fontSize: layout.okButton.fontSize,
        })

        this.cancelButton = PlayerCancelButtonService.new()
    }

    private createButton({
        area,
        buttonText,
        fontSize,
        fillColor,
        strokeColor,
        strokeWeight,
        fontColor,
        textBoxMargin,
    }: {
        area: RectArea
        buttonText: string
        fontSize: number
        fillColor: number[]
        strokeColor: number[]
        strokeWeight: number
        fontColor: number[]
        textBoxMargin: number[]
    }): Label {
        return LabelService.new({
            area,
            fillColor,
            strokeColor,
            strokeWeight,

            text: buttonText,
            fontSize: fontSize,
            horizAlign: HORIZONTAL_ALIGN.CENTER,
            vertAlign: VERTICAL_ALIGN.CENTER,
            fontColor,
            textBoxMargin,
        })
    }
}

const didUserCancelActionConfirmation = ({
    mouseEvent,
    keyboardEvent,
    cancelButtonArea,
    playerInputState,
}: {
    mouseEvent?: OrchestratorComponentMouseEventRelease
    keyboardEvent?: OrchestratorComponentKeyEvent
    cancelButtonArea: RectArea
    playerInputState: PlayerInputState
}): boolean => {
    const actions: PlayerInputAction[] = isValidValue(keyboardEvent)
        ? PlayerInputStateService.getActionsForPressedKey(
              playerInputState,
              keyboardEvent.keyCode
          )
        : []
    switch (true) {
        case isValidValue(mouseEvent) &&
            mouseEvent.mouseRelease.button === MouseButton.CANCEL:
            return true
        case isValidValue(mouseEvent) &&
            mouseEvent.mouseRelease.button === MouseButton.ACCEPT &&
            RectAreaService.isInside(
                cancelButtonArea,
                mouseEvent.mouseRelease.x,
                mouseEvent.mouseRelease.y
            ):
            return true
        case isValidValue(keyboardEvent) &&
            actions.includes(PlayerInputAction.CANCEL):
            return true
        default:
            return false
    }
}

const didUserConfirmActionConfirmation = ({
    mouseEvent,
    keyboardEvent,
    confirmButtonArea,
    playerInputState,
}: {
    mouseEvent?: OrchestratorComponentMouseEventRelease
    keyboardEvent?: OrchestratorComponentKeyEvent
    confirmButtonArea: RectArea
    playerInputState: PlayerInputState
}) => {
    const actions: PlayerInputAction[] = isValidValue(keyboardEvent)
        ? PlayerInputStateService.getActionsForPressedKey(
              playerInputState,
              keyboardEvent.keyCode
          )
        : []
    switch (true) {
        case isValidValue(mouseEvent) &&
            mouseEvent.mouseRelease.button === MouseButton.ACCEPT &&
            RectAreaService.isInside(
                confirmButtonArea,
                mouseEvent.mouseRelease.x,
                mouseEvent.mouseRelease.y
            ):
            return true
        case isValidValue(keyboardEvent) &&
            actions.includes(PlayerInputAction.ACCEPT):
            return true
        default:
            return false
    }
}
