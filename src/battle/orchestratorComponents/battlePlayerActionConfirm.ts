import {
    GOLDEN_RATIO,
    HORIZONTAL_ALIGN,
    VERTICAL_ALIGN,
    WINDOW_SPACING,
} from "../../ui/constants"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { ObjectRepositoryService } from "../objectRepository"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentKeyEventType,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventClicked,
    OrchestratorComponentMouseEventType,
} from "../orchestrator/battleOrchestratorComponent"
import { UIControlSettings } from "../orchestrator/uiControlSettings"
import { BattleOrchestratorMode } from "../orchestrator/battleOrchestrator"
import { TargetingResultsService } from "../targeting/targetingService"
import { RectArea, RectAreaService } from "../../ui/rectArea"
import { OrchestratorUtilities } from "./orchestratorUtils"
import { Label, LabelService } from "../../ui/label"
import { isValidValue } from "../../utils/validityCheck"
import { ActionEffectTemplate } from "../../action/template/actionEffectTemplate"
import { ActionTemplate } from "../../action/template/actionTemplate"
import { MouseButton } from "../../utils/mouseConfig"
import { KeyButtonName, KeyWasPressed } from "../../utils/keyboardConfig"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import { BattleActionDecisionStepService } from "../actionDecision/battleActionDecisionStep"
import { ResourceHandler } from "../../resource/resourceHandler"
import { PlayerCancelButtonService } from "./commonUI/playerCancelButton"

const layout = {
    okButton: {
        startColumn: 6,
        endColumn: 6,
        text: "OK",
        fontSize: 24,
        height: ScreenDimensions.SCREEN_WIDTH / 12,
        top:
            ScreenDimensions.SCREEN_HEIGHT -
            (ScreenDimensions.SCREEN_WIDTH / 12) * GOLDEN_RATIO,
        fillColor: [0, 0, 128],
        strokeColor: [0, 0, 0],
        strokeWeight: 2,
        fontColor: [0, 0, 16],
        textBoxMargin: [0, 0, 0, 0],
        margin: [0, WINDOW_SPACING.SPACING1],
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
            mouseEvent.eventType !== OrchestratorComponentMouseEventType.CLICKED
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
                displayMap: true,
                nextMode: BattleOrchestratorMode.PLAYER_SQUADDIE_TARGET,
            }
        }
        if (this.hasConfirmedAction) {
            return {
                displayMap: true,
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
        mouseEvent?: OrchestratorComponentMouseEventClicked
        keyboardEvent?: OrchestratorComponentKeyEvent
    }) {
        if (
            didUserCancelActionConfirmation({
                mouseEvent,
                keyboardEvent,
                cancelButtonArea: this.cancelButton.rectangle.area,
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
                screenWidth: ScreenDimensions.SCREEN_WIDTH,
                startColumn: layout.okButton.startColumn,
                endColumn: layout.okButton.endColumn,
                margin: layout.okButton.margin,
                top: layout.okButton.top,
                height: layout.okButton.height,
            }),
            buttonText: layout.okButton.text,
            textSize: layout.okButton.fontSize,
        })

        this.cancelButton = PlayerCancelButtonService.new()
    }

    private createButton({
        area,
        buttonText,
        textSize,
        fillColor,
        strokeColor,
        strokeWeight,
        fontColor,
        textBoxMargin,
    }: {
        area: RectArea
        buttonText: string
        textSize: number
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
            textSize: textSize,
            horizAlign: HORIZONTAL_ALIGN.CENTER,
            vertAlign: VERTICAL_ALIGN.CENTER,
            fontColor,
            textBoxMargin,
        })
    }
}

const getActionEffectTemplate = ({
    gameEngineState,
}: {
    gameEngineState: GameEngineState
}): {
    found: boolean
    actionTemplate: ActionTemplate
    actionEffectSquaddieTemplate: ActionEffectTemplate
} => {
    const actionTemplate = ObjectRepositoryService.getActionTemplateById(
        gameEngineState.repository,
        BattleActionDecisionStepService.getAction(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionDecisionStep
        ).actionTemplateId
    )
    if (!isValidValue(actionTemplate)) {
        return {
            found: false,
            actionTemplate,
            actionEffectSquaddieTemplate: undefined,
        }
    }

    const actionEffectTemplate = actionTemplate.actionEffectTemplates[0]

    return {
        found: true,
        actionTemplate,
        actionEffectSquaddieTemplate: actionEffectTemplate,
    }
}

const didUserCancelActionConfirmation = ({
    mouseEvent,
    keyboardEvent,
    cancelButtonArea,
}: {
    mouseEvent?: OrchestratorComponentMouseEventClicked
    keyboardEvent?: OrchestratorComponentKeyEvent
    cancelButtonArea: RectArea
}): boolean => {
    switch (true) {
        case isValidValue(mouseEvent) &&
            mouseEvent.mouseButton === MouseButton.CANCEL:
            return true
        case isValidValue(mouseEvent) &&
            mouseEvent.mouseButton === MouseButton.ACCEPT &&
            RectAreaService.isInside(
                cancelButtonArea,
                mouseEvent.mouseX,
                mouseEvent.mouseY
            ):
            return true
        case isValidValue(keyboardEvent) &&
            KeyWasPressed(KeyButtonName.CANCEL, keyboardEvent.keyCode):
            return true
        default:
            return false
    }
}

const didUserConfirmActionConfirmation = ({
    mouseEvent,
    keyboardEvent,
    confirmButtonArea,
}: {
    mouseEvent?: OrchestratorComponentMouseEventClicked
    keyboardEvent?: OrchestratorComponentKeyEvent
    confirmButtonArea: RectArea
}) => {
    switch (true) {
        case isValidValue(mouseEvent) &&
            mouseEvent.mouseButton === MouseButton.ACCEPT &&
            RectAreaService.isInside(
                confirmButtonArea,
                mouseEvent.mouseX,
                mouseEvent.mouseY
            ):
            return true
        case isValidValue(keyboardEvent) &&
            KeyWasPressed(KeyButtonName.ACCEPT, keyboardEvent.keyCode) === true:
            return true
        default:
            return false
    }
}
