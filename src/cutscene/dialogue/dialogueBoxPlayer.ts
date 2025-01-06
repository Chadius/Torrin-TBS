import { RectArea, RectAreaService } from "../../ui/rectArea"
import { CutsceneActionPlayerType } from "../cutsceneAction"
import { DialogueTextBox } from "./dialogueTextBox"
import { DialoguePortraitImage } from "./dialoguePortraitImage"
import { DialogueAnswerButton } from "./dialogueAnswerButton"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import {
    SubstituteText,
    TextSubstitutionContext,
} from "../../textSubstitution/textSubstitution"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import { Dialogue, DialogueService } from "./dialogue"
import { isValidValue } from "../../utils/validityCheck"
import p5 from "p5"
import {
    DIALOGUE_SPEAKER_PORTRAIT_STYLE_CONSTANTS,
    DialogueComponent,
    DialogueTextService,
} from "./constants"
import { ResourceHandler } from "../../resource/resourceHandler"
import { OrchestratorComponentKeyEvent } from "../../battle/orchestrator/battleOrchestratorComponent"
import {
    PlayerInputAction,
    PlayerInputState,
    PlayerInputStateService,
} from "../../ui/playerInput/playerInputState"

export interface DialoguePlayerState {
    type: CutsceneActionPlayerType.DIALOGUE
    dialogue: Dialogue

    dialogFinished: boolean
    startTime: number
    answerSelected: number

    answerButtons: DialogueAnswerButton[]
    textBox: DialogueTextBox
    speakerNameBox: DialogueTextBox
    speakerPortrait: p5.Image
    speakerImage: DialoguePortraitImage
}

export const DialoguePlayerService = {
    new: ({
        dialogue,
        dialogFinished,
        startTime,
        answerSelected,
        answerButtons,
        textBox,
        speakerNameBox,
        speakerPortrait,
        speakerImage,
    }: {
        dialogue: Dialogue
        dialogFinished?: boolean
        startTime?: number
        answerSelected?: number
        answerButtons?: DialogueAnswerButton[]
        textBox?: DialogueTextBox
        speakerNameBox?: DialogueTextBox
        speakerPortrait?: p5.Image
        speakerImage?: DialoguePortraitImage
    }): DialoguePlayerState => {
        return {
            type: CutsceneActionPlayerType.DIALOGUE,
            dialogue: dialogue,
            dialogFinished: isValidValue(dialogFinished)
                ? dialogFinished
                : false,
            startTime: startTime,
            answerSelected: answerSelected,
            answerButtons: isValidValue(answerButtons) ? answerButtons : [],
            textBox: textBox,
            speakerNameBox: speakerNameBox,
            speakerPortrait: speakerPortrait,
            speakerImage: speakerImage,
        }
    },
    start: (
        state: DialoguePlayerState,
        context: TextSubstitutionContext
    ): void => {
        state.dialogFinished = false
        state.startTime = Date.now()
        createUIObjects(state, context)
    },
    isAnimating: (state: DialoguePlayerState): boolean => {
        if (
            isTimeExpired(state) &&
            !DialogueService.asksUserForAnAnswer(state.dialogue)
        ) {
            return false
        }

        return !state.dialogFinished
    },
    isFinished: (state: DialoguePlayerState): boolean => {
        return !isAnimating(state) || state.dialogFinished
    },
    mouseClicked: (
        state: DialoguePlayerState,
        mouseX: number,
        mouseY: number
    ) => {
        if (DialogueService.asksUserForAnAnswer(state.dialogue)) {
            const answerSelected: number | null = state.answerButtons.findIndex(
                (answerButton) => {
                    return answerButton.buttonWasClicked(mouseX, mouseY)
                }
            )

            if (answerSelected !== -1) {
                state.dialogFinished = true
                state.answerSelected = answerSelected
            }
            return
        }

        if (
            isAnimating(state) &&
            !DialogueService.asksUserForAnAnswer(state.dialogue)
        ) {
            state.dialogFinished = true
        }
    },
    draw: (
        state: DialoguePlayerState,
        graphicsContext: GraphicsBuffer,
        resourceHandler: ResourceHandler
    ) => {
        graphicsContext.push()
        drawBackground(state, graphicsContext)
        state.speakerImage?.draw(graphicsContext, resourceHandler)
        state.textBox?.draw(graphicsContext)

        state.speakerNameBox?.draw(graphicsContext)
        state.answerButtons.forEach((answer) => answer.draw(graphicsContext))

        graphicsContext.pop()
    },
    setImageResource: (state: DialoguePlayerState, image: p5.Image) => {
        setPortrait(state, image)
    },
    keyPressed: ({
        dialoguePlayerState,
        event,
        playerInputState,
    }: {
        dialoguePlayerState: DialoguePlayerState
        event: OrchestratorComponentKeyEvent
        playerInputState: PlayerInputState
    }) => {
        const actions: PlayerInputAction[] =
            PlayerInputStateService.getActionsForPressedKey(
                playerInputState,
                event.keyCode
            )

        if (
            isAnimating(dialoguePlayerState) &&
            !DialogueService.asksUserForAnAnswer(
                dialoguePlayerState.dialogue
            ) &&
            actions.includes(PlayerInputAction.ACCEPT)
        ) {
            dialoguePlayerState.dialogFinished = true
        }
    },
}

const setPortrait = (state: DialoguePlayerState, portrait: p5.Image) => {
    state.speakerPortrait = portrait
    setSpeakerUI(state)
}

const isAnimating = (state: DialoguePlayerState): boolean => {
    if (
        isTimeExpired(state) &&
        !DialogueService.asksUserForAnAnswer(state.dialogue)
    ) {
        return false
    }

    return !state.dialogFinished
}

const isTimeExpired = (state: DialoguePlayerState): boolean => {
    if (!isValidValue(state)) {
        return true
    }

    if (!isValidValue(state.dialogue)) {
        return true
    }

    if (!isValidValue(state.dialogue.animationDuration)) {
        return true
    }

    return Date.now() >= state.startTime + state.dialogue.animationDuration
}

const createUIObjects = (
    state: DialoguePlayerState,
    context: TextSubstitutionContext
) => {
    state.textBox = new DialogueTextBox({
        text: SubstituteText(state.dialogue.dialogueText, context),
        position: state.dialogue.dialogueTextPosition,
        fontStyle: state.dialogue.dialogueTextFontStyle,
        component: DialogueComponent.DIALOGUE_BOX,
    })
    state.speakerNameBox = new DialogueTextBox({
        text: state.dialogue.speakerName,
        position: state.dialogue.speakerNamePosition,
        fontStyle: state.dialogue.speakerNameFontStyle,
        component: DialogueComponent.SPEAKER_NAME,
    })

    const answerButtonPositions: RectArea[] = getAnswerButtonPositions(state)
    state.answerButtons = answerButtonPositions.map(
        (position, index) =>
            new DialogueAnswerButton({
                answer: SubstituteText(state.dialogue.answers[index], context),
                position: position,
            })
    )

    setSpeakerUI(state)
}

const setSpeakerUI = (state: DialoguePlayerState) => {
    if (state.speakerPortrait) {
        state.speakerImage = new DialoguePortraitImage({
            speakerPortrait: state.speakerPortrait,
            position: state.dialogue.speakerPortraitPosition,
        })
    }
}

const getAnswerButtonPositions = (state: DialoguePlayerState): RectArea[] => {
    if (!DialogueService.asksUserForAnAnswer(state.dialogue)) {
        return []
    }

    const buttonTop = ScreenDimensions.SCREEN_WIDTH * 0.9
    const buttonHeight = ScreenDimensions.SCREEN_HEIGHT * 0.1

    const rectStyle =
        DIALOGUE_SPEAKER_PORTRAIT_STYLE_CONSTANTS[
            state.dialogue.dialogueTextPosition
        ]
    const speakerBoxWidth = rectStyle.maxWidth
        ? Math.min(ScreenDimensions.SCREEN_WIDTH, rectStyle.maxWidth) -
          rectStyle.horizontalMargin * 2
        : ScreenDimensions.SCREEN_WIDTH * rectStyle.widthFraction
    let dialogueTextLabelLeft: number =
        DialogueTextService.calculateLeftAlignSide({
            rectStyle,
            dialogueBoxWidth: speakerBoxWidth,
            horizontalMargin: 0,
        })

    if (state.dialogue.answers.length == 1) {
        return [
            RectAreaService.new({
                left: dialogueTextLabelLeft,
                top: buttonTop,
                width: ScreenDimensions.SCREEN_WIDTH,
                height: buttonHeight,
            }),
        ]
    }

    const BUTTON_GAP_WHITESPACE_PERCENTAGE = 25
    const BUTTON_GAP_PIXEL_MINIMUM = 50

    let numberOfGaps = state.dialogue.answers.length - 1
    let rawTotalButtonGapSpace =
        (ScreenDimensions.SCREEN_WIDTH * BUTTON_GAP_WHITESPACE_PERCENTAGE) / 100

    let buttonGapWidth = rawTotalButtonGapSpace / numberOfGaps
    if (buttonGapWidth < BUTTON_GAP_PIXEL_MINIMUM) {
        buttonGapWidth = BUTTON_GAP_PIXEL_MINIMUM
    }

    let totalButtonGap = buttonGapWidth * (state.dialogue.answers.length - 1)
    let totalButtonSpace = ScreenDimensions.SCREEN_WIDTH - totalButtonGap
    let buttonWidth = totalButtonSpace / state.dialogue.answers.length

    return state.dialogue.answers.map((_, index): RectArea => {
        return RectAreaService.new({
            left:
                dialogueTextLabelLeft + (buttonWidth + buttonGapWidth) * index,
            top: buttonTop,
            width: buttonWidth,
            height: buttonHeight,
        })
    })
}

const drawBackground = (
    state: DialoguePlayerState,
    graphicsContext: GraphicsBuffer
) => {
    if (isValidValue(state.dialogue.backgroundColor)) {
        graphicsContext.push()
        graphicsContext.fill(
            state.dialogue.backgroundColor[0],
            state.dialogue.backgroundColor[1],
            state.dialogue.backgroundColor[2]
        )
        graphicsContext.rect(
            0,
            0,
            ScreenDimensions.SCREEN_WIDTH,
            ScreenDimensions.SCREEN_HEIGHT
        )
        graphicsContext.pop()
    }
}
