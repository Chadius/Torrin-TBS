import { RectArea, RectAreaService } from "../../ui/rectArea"
import {
    CutsceneActionPlayerType,
    TCutsceneActionPlayerType,
} from "../cutsceneAction"
import { DialogueTextBox } from "./dialogueTextBox"
import {
    DialoguePortraitImage,
    DialoguePortraitImageService,
} from "./dialoguePortraitImage"
import { DialogueAnswerButton } from "./dialogueAnswerButton"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import {
    SubstituteText,
    TextSubstitutionContext,
} from "../../textSubstitution/textSubstitution"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import { Dialogue, DialogueService } from "./dialogue"
import { isValidValue } from "../../utils/objectValidityCheck"
import p5 from "p5"
import {
    DIALOGUE_SPEAKER_PORTRAIT_STYLE_CONSTANTS,
    DialogueComponent,
    DialogueFontStyle,
    DialoguePosition,
} from "./constants"
import { ResourceHandler } from "../../resource/resourceHandler"
import { OrchestratorComponentKeyEvent } from "../../battle/orchestrator/battleOrchestratorComponent"
import {
    PlayerInputAction,
    PlayerInputState,
    PlayerInputStateService,
    TPlayerInputAction,
} from "../../ui/playerInput/playerInputState"
import { MousePress } from "../../utils/mouseConfig"
import { WINDOW_SPACING } from "../../ui/constants.ts"

export interface DialoguePlayerState {
    type: TCutsceneActionPlayerType
    dialogue: Dialogue

    dialogFinished: boolean
    startTime: number | undefined
    answerSelected: number | undefined

    answerButtons: DialogueAnswerButton[]
    textBox: DialogueTextBox | undefined
    speakerNameBox: DialogueTextBox | undefined
    speakerPortrait: p5.Image | undefined
    speakerImage: DialoguePortraitImage | undefined
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
            dialogFinished: dialogFinished ?? false,
            startTime: startTime,
            answerSelected: answerSelected,
            answerButtons: answerButtons ?? [],
            textBox: textBox,
            speakerNameBox: speakerNameBox,
            speakerPortrait: speakerPortrait,
            speakerImage: speakerImage,
        }
    },
    start: (
        dialoguePlayerState: DialoguePlayerState,
        context: TextSubstitutionContext
    ): void => {
        dialoguePlayerState.dialogFinished = false
        dialoguePlayerState.startTime = Date.now()
        createDialogueMainTextBox(dialoguePlayerState, context)
        createAnswerButtons(dialoguePlayerState, context)
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
        dialoguePlayerState: DialoguePlayerState,
        mousePress: MousePress
    ) => {
        if (DialogueService.asksUserForAnAnswer(dialoguePlayerState.dialogue)) {
            const answerSelected: number | null =
                dialoguePlayerState.answerButtons.findIndex((answerButton) => {
                    return answerButton.buttonWasClicked(mousePress)
                })

            if (answerSelected !== -1) {
                dialoguePlayerState.dialogFinished = true
                dialoguePlayerState.answerSelected = answerSelected
            }
            return
        }

        if (
            isAnimating(dialoguePlayerState) &&
            !DialogueService.asksUserForAnAnswer(dialoguePlayerState.dialogue)
        ) {
            dialoguePlayerState.dialogFinished = true
        }
    },
    draw: (
        dialoguePlayerState: DialoguePlayerState,
        graphicsContext: GraphicsBuffer,
        resourceHandler: ResourceHandler
    ) => {
        if (dialoguePlayerState.speakerNameBox == undefined) {
            createDialogueSpeakerNameTextBoxAboveMainTextBox(
                dialoguePlayerState
            )
            if (dialoguePlayerState.speakerNameBox != undefined) {
                // @ts-ignore if statement checks to make sure the object was created
                dialoguePlayerState.speakerNameBox.draw(graphicsContext)
            }
        }

        graphicsContext.push()
        drawBackground(dialoguePlayerState, graphicsContext)
        if (dialoguePlayerState.speakerImage == undefined)
            setSpeakerUI(dialoguePlayerState)

        if (dialoguePlayerState.speakerImage != undefined)
            DialoguePortraitImageService.draw({
                graphics: graphicsContext,
                resourceHandler,
                portraitImage: dialoguePlayerState.speakerImage,
            })
        dialoguePlayerState.speakerNameBox?.draw(graphicsContext)
        dialoguePlayerState.textBox?.draw(graphicsContext)

        dialoguePlayerState.answerButtons.forEach((answer) =>
            answer.draw(graphicsContext)
        )

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
        const actions: TPlayerInputAction[] =
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

    if (state.startTime == undefined) {
        return false
    }

    return Date.now() >= state.startTime + state.dialogue.animationDuration
}

const setSpeakerUI = (dialoguePlayerState: DialoguePlayerState) => {
    if (
        dialoguePlayerState.speakerPortrait == undefined ||
        dialoguePlayerState.textBox?.dialogueTextLabel == undefined
    )
        return

    dialoguePlayerState.speakerImage = DialoguePortraitImageService.new({
        speakerPortrait: dialoguePlayerState.speakerPortrait,
        position: dialoguePlayerState.dialogue.speakerPortraitPosition,
        speakerNameBox: dialoguePlayerState.speakerNameBox,
        relativePlacementArea:
            dialoguePlayerState.textBox?.dialogueTextLabel.rectangle.area,
    })
}

const drawBackground = (
    dialoguePlayerState: DialoguePlayerState,
    graphics: GraphicsBuffer
) => {
    if (!dialoguePlayerState.dialogue.backgroundColor) {
        return
    }

    graphics.push()
    graphics.fill(
        dialoguePlayerState.dialogue.backgroundColor[0],
        dialoguePlayerState.dialogue.backgroundColor[1],
        dialoguePlayerState.dialogue.backgroundColor[2]
    )
    graphics.rect(
        0,
        0,
        ScreenDimensions.SCREEN_WIDTH,
        ScreenDimensions.SCREEN_HEIGHT
    )
    graphics.pop()
}

const createDialogueMainTextBox = (
    dialoguePlayerState: DialoguePlayerState,
    context: TextSubstitutionContext
) => {
    dialoguePlayerState.textBox = new DialogueTextBox({
        text: SubstituteText(
            dialoguePlayerState.dialogue.dialogueText,
            context
        ),
        position:
            dialoguePlayerState.dialogue.dialogueTextPosition ??
            DialoguePosition.CENTER,
        fontStyle:
            dialoguePlayerState.dialogue.dialogueTextFontStyle ??
            DialogueFontStyle.BLACK,
        dialogueComponent: DialogueComponent.DIALOGUE_BOX,
    })
}

const createDialogueSpeakerNameTextBoxAboveMainTextBox = (
    dialoguePlayerState: DialoguePlayerState
) => {
    if (dialoguePlayerState.textBox?.dialogueTextLabel == undefined) return
    if (dialoguePlayerState.speakerNameBox) return
    dialoguePlayerState.speakerNameBox = new DialogueTextBox({
        text: dialoguePlayerState.dialogue.speakerName,
        relativePlacementArea:
            dialoguePlayerState.textBox?.dialogueTextLabel?.rectangle.area,
        position:
            dialoguePlayerState.dialogue.speakerNamePosition ??
            DialoguePosition.RIGHT,
        fontStyle:
            dialoguePlayerState.dialogue.speakerNameFontStyle ??
            DialogueFontStyle.BLACK,
        dialogueComponent: DialogueComponent.SPEAKER_NAME,
    })
}

const createAnswerButtons = (
    dialoguePlayerState: DialoguePlayerState,
    context: TextSubstitutionContext
) => {
    const answerButtonPositions: RectArea[] =
        getAnswerButtonPositions(dialoguePlayerState)
    dialoguePlayerState.answerButtons = answerButtonPositions
        .map((position, index) =>
            dialoguePlayerState.dialogue.answers
                ? new DialogueAnswerButton({
                      answer: SubstituteText(
                          dialoguePlayerState.dialogue.answers[index],
                          context
                      ),
                      position: position,
                  })
                : undefined
        )
        .filter((x) => x != undefined)
}

const getAnswerButtonPositions = (state: DialoguePlayerState): RectArea[] => {
    if (!DialogueService.asksUserForAnAnswer(state.dialogue)) {
        return []
    }

    const buttonTop = ScreenDimensions.SCREEN_WIDTH * 0.9
    const buttonHeight = ScreenDimensions.SCREEN_HEIGHT * 0.1

    const rectStyle =
        DIALOGUE_SPEAKER_PORTRAIT_STYLE_CONSTANTS[
            state.dialogue.dialogueTextPosition ?? DialoguePosition.LEFT
        ]

    let speakerBoxWidth = 0
    if (rectStyle.maxWidth) {
        if (rectStyle.horizontalMargin == undefined) return []
        speakerBoxWidth =
            Math.min(ScreenDimensions.SCREEN_WIDTH, rectStyle.maxWidth) -
            rectStyle.horizontalMargin * 2
    } else {
        if (rectStyle.widthFraction == undefined) return []
        speakerBoxWidth =
            ScreenDimensions.SCREEN_WIDTH * rectStyle.widthFraction
    }

    let dialogueAnswerLabelLeft: number = {
        [DialoguePosition.LEFT]: WINDOW_SPACING.SPACING2,
        [DialoguePosition.CENTER]:
            (ScreenDimensions.SCREEN_WIDTH - speakerBoxWidth) / 2,
        [DialoguePosition.RIGHT]:
            ScreenDimensions.SCREEN_WIDTH - speakerBoxWidth,
    }[state.dialogue.dialogueTextPosition ?? DialoguePosition.LEFT]

    if (state.dialogue.answers == undefined) return []
    if (state.dialogue.answers.length == 1) {
        return [
            RectAreaService.new({
                left: dialogueAnswerLabelLeft,
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
                dialogueAnswerLabelLeft +
                (buttonWidth + buttonGapWidth) * index,
            top: buttonTop,
            width: buttonWidth,
            height: buttonHeight,
        })
    })
}
