import { HORIZONTAL_ALIGN, VERTICAL_ALIGN } from "../../ui/constants"
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
import {
    SquaddieSummaryPopoverPosition,
    SquaddieSummaryPopoverService,
} from "../hud/playerActionPanel/squaddieSummaryPopover"
import {
    AttributeType,
    AttributeTypeAndAmount,
    AttributeTypeAndAmountService,
} from "../../squaddie/attributeModifier"
import { CalculatorAttack } from "../calculator/actionCalculator/attack"
import { BattleActionDecisionStepService } from "../actionDecision/battleActionDecisionStep"

export const TARGET_CANCEL_BUTTON_TOP = ScreenDimensions.SCREEN_HEIGHT * 0.9
const BUTTON_MIDDLE_DIVIDER = ScreenDimensions.SCREEN_WIDTH / 2
const MESSAGE_TEXT_SIZE = 24

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

    update(
        gameEngineState: GameEngineState,
        graphicsContext: GraphicsBuffer
    ): void {
        movePopoversPositions(
            gameEngineState,
            SquaddieSummaryPopoverPosition.SELECT_TARGET
        )

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
            movePopoversPositions(
                gameEngineState,
                SquaddieSummaryPopoverPosition.SELECT_MAIN
            )
            return {
                displayMap: true,
                nextMode: BattleOrchestratorMode.PLAYER_SQUADDIE_TARGET,
            }
        }
        if (this.hasConfirmedAction) {
            movePopoversPositions(
                gameEngineState,
                SquaddieSummaryPopoverPosition.ANIMATE_SQUADDIE_ACTION
            )
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
        this.drawButton(
            RectAreaService.new({
                left: 0,
                top: TARGET_CANCEL_BUTTON_TOP,
                width: ScreenDimensions.SCREEN_WIDTH,
                height:
                    ScreenDimensions.SCREEN_HEIGHT - TARGET_CANCEL_BUTTON_TOP,
            }),
            "CANCEL: Click here.",
            graphicsContext
        )

        let actingSquaddieModifiers: AttributeTypeAndAmount[] = []

        let multipleAttackPenalty =
            CalculatorAttack.calculateMultipleAttackPenaltyForActionsThisTurn(
                gameEngineState
            )
        if (multipleAttackPenalty !== 0) {
            actingSquaddieModifiers.push(
                AttributeTypeAndAmountService.new({
                    type: AttributeType.MULTIPLE_ATTACK_PENALTY,
                    amount: multipleAttackPenalty,
                })
            )
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
            actingSquaddieModifiers,
        })

        intentMessages.push(
            ...["", "CONFIRM: Left Mouse Button", "CANCEL: Right Mouse Button"]
        )

        const messageToShow = intentMessages.join("\n")

        this.drawButton(
            RectAreaService.new({
                left: ScreenDimensions.SCREEN_WIDTH / 12,
                top: ScreenDimensions.SCREEN_HEIGHT / 2,
                width: BUTTON_MIDDLE_DIVIDER,
                height: MESSAGE_TEXT_SIZE * (intentMessages.length + 2),
            }),
            messageToShow,
            graphicsContext
        )
    }

    private drawButton(
        area: RectArea,
        buttonText: string,
        graphicsContext: GraphicsBuffer
    ) {
        const buttonBackground = LabelService.new({
            area,
            fillColor: [0, 0, 60],
            strokeColor: [0, 0, 0],
            strokeWeight: 4,

            text: buttonText,
            textSize: MESSAGE_TEXT_SIZE,
            horizAlign: HORIZONTAL_ALIGN.CENTER,
            vertAlign: VERTICAL_ALIGN.CENTER,
            fontColor: [0, 0, 16],
            textBoxMargin: [0, 0, 0, 0],
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
    if (isValidValue(mouseEvent)) {
        return (
            mouseEvent.mouseButton === MouseButton.CANCEL ||
            mouseEvent.mouseY > TARGET_CANCEL_BUTTON_TOP
        )
    }
    if (isValidValue(keyboardEvent)) {
        return KeyWasPressed(KeyButtonName.CANCEL, keyboardEvent.keyCode)
    }
    return false
}

const movePopoversPositions = (
    gameEngineState: GameEngineState,
    position: SquaddieSummaryPopoverPosition
) => {
    SquaddieSummaryPopoverService.changePopoverPosition({
        popover:
            gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState.squaddieSummaryPopoversByType.MAIN,
        position,
    })
    SquaddieSummaryPopoverService.changePopoverPosition({
        popover:
            gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState.squaddieSummaryPopoversByType.TARGET,
        position,
    })
}
