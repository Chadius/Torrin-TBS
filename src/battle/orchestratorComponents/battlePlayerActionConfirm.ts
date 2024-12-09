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
import { LabelService } from "../../ui/label"
import { isValidValue } from "../../utils/validityCheck"
import { ActionEffectTemplate } from "../../action/template/actionEffectTemplate"
import { ActionResultTextService } from "../animation/actionResultTextService"
import { ActionTemplate } from "../../action/template/actionTemplate"
import { MouseButton } from "../../utils/mouseConfig"
import { KeyButtonName, KeyWasPressed } from "../../utils/keyboardConfig"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import { CalculatorAttack } from "../calculator/actionCalculator/attack"
import { BattleActionDecisionStepService } from "../actionDecision/battleActionDecisionStep"
import { RollModifierType } from "../calculator/actionCalculator/rollResult"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { ResourceHandler } from "../../resource/resourceHandler"

const BUTTON_MIDDLE_DIVIDER = ScreenDimensions.SCREEN_WIDTH / 2
const MESSAGE_TEXT_SIZE = 24

const layout = {
    middleButton: {
        fillColor: [0, 0, 60],
        strokeColor: [0, 0, 0],
        strokeWeight: 4,
        fontColor: [0, 0, 16],
        textBoxMargin: [0, 0, 0, 0],
    },
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
    cancelButton: {
        startColumn: 6,
        endColumn: 6,
        text: "Cancel",
        fontSize: 16,
        height: (ScreenDimensions.SCREEN_WIDTH / 12) * (GOLDEN_RATIO - 1),
        fillColor: [0, 0, 64],
        strokeColor: [0, 0, 0],
        strokeWeight: 0,
        fontColor: [0, 0, 16],
        textBoxMargin: [0, 0, 0, 0],
        margin: 0,
    },
}

export class BattlePlayerActionConfirm implements BattleOrchestratorComponent {
    private cancelAbility: boolean
    private hasConfirmedAction: boolean

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
        this.drawConfirmWindow(gameEngineState, graphicsContext)
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
                gameEngineState,
                mouseEvent,
                keyboardEvent,
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
            !this.didUserConfirmActionConfirmation({
                gameEngineState,
                mouseEvent,
                keyboardEvent,
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

    private didUserConfirmActionConfirmation({
        gameEngineState,
        mouseEvent,
        keyboardEvent,
    }: {
        gameEngineState: GameEngineState
        mouseEvent?: OrchestratorComponentMouseEventClicked
        keyboardEvent?: OrchestratorComponentKeyEvent
    }) {
        if (
            isValidValue(mouseEvent) &&
            mouseEvent.mouseButton !== MouseButton.ACCEPT
        ) {
            return false
        }
        if (
            isValidValue(keyboardEvent) &&
            KeyWasPressed(KeyButtonName.ACCEPT, keyboardEvent.keyCode) !== true
        ) {
            return false
        }
        return true
    }

    private resetObject() {
        this.hasConfirmedAction = false
        this.cancelAbility = false
    }

    private drawConfirmWindow(
        gameEngineState: GameEngineState,
        graphicsContext: GraphicsBuffer
    ) {
        this.drawButton({
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
            graphicsContext: graphicsContext,
            textSize: layout.okButton.fontSize,
        })
        this.drawButton({
            ...layout.cancelButton,
            area: RectAreaService.new({
                screenWidth: ScreenDimensions.SCREEN_WIDTH,
                startColumn: layout.cancelButton.startColumn,
                endColumn: layout.cancelButton.endColumn,
                margin: layout.cancelButton.margin,
                top:
                    ScreenDimensions.SCREEN_HEIGHT - layout.cancelButton.height,
                height: layout.cancelButton.height,
            }),
            buttonText: layout.cancelButton.text,
            graphicsContext: graphicsContext,
            textSize: layout.cancelButton.fontSize,
        })

        const battleSquaddieId = BattleActionDecisionStepService.getActor(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionDecisionStep
        ).battleSquaddieId
        const { squaddieTemplate } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                gameEngineState.repository,
                battleSquaddieId
            )
        )

        let rollModifiers: { [r in RollModifierType]?: number } = {
            [RollModifierType.TIER]: squaddieTemplate.attributes.tier,
        }

        let multipleAttackPenalty =
            CalculatorAttack.calculateMultipleAttackPenaltyForActionsThisTurn(
                gameEngineState
            )
        if (multipleAttackPenalty !== 0) {
            rollModifiers[RollModifierType.MULTIPLE_ATTACK_PENALTY] =
                multipleAttackPenalty
        }

        const { found, actionTemplate, actionEffectSquaddieTemplate } =
            getActionEffectTemplate({
                gameEngineState: gameEngineState,
            })
        if (!found) {
            return
        }
        const intentMessages = ActionResultTextService.outputIntentForTextOnly({
            currentActionEffectTemplate: actionEffectSquaddieTemplate,
            actionTemplate,
            actingBattleSquaddieId: BattleActionDecisionStepService.getActor(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep
            ).battleSquaddieId,
            squaddieRepository: gameEngineState.repository,
            actingSquaddieModifiers: [],
            rollModifiers,
        })

        intentMessages.push(
            ...["", "CONFIRM: Left Mouse Button", "CANCEL: Right Mouse Button"]
        )

        const messageToShow = intentMessages.join("\n")

        this.drawButton({
            ...layout.middleButton,
            area: RectAreaService.new({
                left: ScreenDimensions.SCREEN_WIDTH / 12,
                top: ScreenDimensions.SCREEN_HEIGHT / 2,
                width: BUTTON_MIDDLE_DIVIDER,
                height: MESSAGE_TEXT_SIZE * (intentMessages.length + 2),
            }),
            buttonText: messageToShow,
            graphicsContext: graphicsContext,
            textSize: MESSAGE_TEXT_SIZE,
        })
    }

    private drawButton({
        area,
        buttonText,
        graphicsContext,
        textSize,
        fillColor,
        strokeColor,
        strokeWeight,
        fontColor,
        textBoxMargin,
    }: {
        area: RectArea
        buttonText: string
        graphicsContext: GraphicsBuffer
        textSize: number
        fillColor: number[]
        strokeColor: number[]
        strokeWeight: number
        fontColor: number[]
        textBoxMargin: number[]
    }) {
        const buttonBackground = LabelService.new({
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

        LabelService.draw(buttonBackground, graphicsContext)
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
    gameEngineState,
    mouseEvent,
    keyboardEvent,
}: {
    gameEngineState: GameEngineState
    mouseEvent?: OrchestratorComponentMouseEventClicked
    keyboardEvent?: OrchestratorComponentKeyEvent
}): boolean => {
    const cancelButtonArea = RectAreaService.new({
        screenWidth: ScreenDimensions.SCREEN_WIDTH,
        startColumn: layout.cancelButton.startColumn,
        endColumn: layout.cancelButton.endColumn,
        margin: [0, WINDOW_SPACING.SPACING2],
        top: ScreenDimensions.SCREEN_HEIGHT - layout.cancelButton.height,
        height: layout.cancelButton.height,
    })
    if (isValidValue(mouseEvent)) {
        return (
            mouseEvent.mouseButton === MouseButton.CANCEL ||
            RectAreaService.isInside(
                cancelButtonArea,
                mouseEvent.mouseX,
                mouseEvent.mouseY
            )
        )
    }
    if (isValidValue(keyboardEvent)) {
        return KeyWasPressed(KeyButtonName.CANCEL, keyboardEvent.keyCode)
    }
    return false
}
