import {RectArea, RectAreaService} from "../../ui/rectArea";
import {CutsceneActionPlayerType} from "../cutsceneAction";
import {DialogueTextBox} from "./dialogueTextBox";
import {DialogueSpeakerNameBox} from "./dialogueSpeakerNameBox";
import {DialogueSpeakerImage} from "./dialogueSpeakerImage";
import {DialogueAnswerButton} from "./dialogueAnswerButton";
import {GraphicImage, GraphicsContext} from "../../utils/graphics/graphicsContext";
import {SubstituteText, TextSubstitutionContext} from "../../textSubstitution/textSubstitution";
import {ScreenDimensions} from "../../utils/graphics/graphicsConfig";
import {Dialogue, DialogueService} from "./dialogue";
import {isValidValue} from "../../utils/validityCheck";

export interface DialoguePlayerState {
    type: CutsceneActionPlayerType.DIALOGUE;
    dialogue: Dialogue;

    dialogFinished: boolean;
    startTime: number;
    answerSelected: number;

    answerButtons: DialogueAnswerButton[];
    textBox: DialogueTextBox;
    speakerNameBox: DialogueSpeakerNameBox;
    speakerPortrait: GraphicImage;
    speakerImage: DialogueSpeakerImage;
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
        dialogue: Dialogue;
        dialogFinished?: boolean;
        startTime?: number;
        answerSelected?: number;
        answerButtons?: DialogueAnswerButton[];
        textBox?: DialogueTextBox;
        speakerNameBox?: DialogueSpeakerNameBox;
        speakerPortrait?: GraphicImage;
        speakerImage?: DialogueSpeakerImage;
    }): DialoguePlayerState => {
        return {
            type: CutsceneActionPlayerType.DIALOGUE,
            dialogue: dialogue,
            dialogFinished: isValidValue(dialogFinished) ? dialogFinished : false,
            startTime: startTime,
            answerSelected: answerSelected,
            answerButtons: isValidValue(answerButtons) ? answerButtons : [],
            textBox: textBox,
            speakerNameBox: speakerNameBox,
            speakerPortrait: speakerPortrait,
            speakerImage: speakerImage,
        }
    },
    start: (state: DialoguePlayerState, context: TextSubstitutionContext): void => {
        state.dialogFinished = false;
        state.startTime = Date.now();
        createUIObjects(state, context);
    },
    isAnimating: (state: DialoguePlayerState): boolean => {
        if (isTimeExpired(state) && !DialogueService.asksUserForAnAnswer(state.dialogue)) {
            return false;
        }

        return !state.dialogFinished;
    },
    isFinished: (state: DialoguePlayerState): boolean => {
        return !isAnimating(state) || state.dialogFinished;
    },
    mouseClicked: (state: DialoguePlayerState, mouseX: number, mouseY: number) => {
        if (DialogueService.asksUserForAnAnswer(state.dialogue)) {
            const answerSelected: number | null = state.answerButtons.findIndex((answerButton) => {
                return answerButton.buttonWasClicked(mouseX, mouseY);
            });

            if (answerSelected !== -1) {
                state.dialogFinished = true;
                state.answerSelected = answerSelected;
            }
            return;
        }

        if (isAnimating(state) && !DialogueService.asksUserForAnAnswer(state.dialogue)) {
            state.dialogFinished = true;
        }
    },
    draw: (state: DialoguePlayerState, graphicsContext: GraphicsContext) => {
        graphicsContext.push();

        state.textBox?.draw(graphicsContext);
        state.speakerNameBox?.draw(graphicsContext);
        state.speakerImage?.draw(graphicsContext);
        state.answerButtons.forEach((answer) => answer.draw(graphicsContext));

        graphicsContext.pop();
    },
    setImageResource: (state: DialoguePlayerState, image: GraphicImage) => {
        setPortrait(state, image);
    },
}

const setPortrait = (state: DialoguePlayerState, portrait: GraphicImage) => {
    state.speakerPortrait = portrait;
    setSpeakerUI(state);
}

const isAnimating = (state: DialoguePlayerState): boolean => {
    if (isTimeExpired(state) && !DialogueService.asksUserForAnAnswer(state.dialogue)) {
        return false;
    }

    return !state.dialogFinished;
}

const isTimeExpired = (state: DialoguePlayerState): boolean => {
    if (!isValidValue(state)) {
        return true;
    }

    if (!isValidValue(state.dialogue)) {
        return true;
    }

    if (!isValidValue(state.dialogue.animationDuration)) {
        return true;
    }

    return Date.now() >= state.startTime + state.dialogue.animationDuration;
}

const createUIObjects = (state: DialoguePlayerState, context: TextSubstitutionContext) => {
    state.textBox = new DialogueTextBox({
        text: SubstituteText(state.dialogue.speakerText, context),
        screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT]
    });
    state.speakerNameBox = new DialogueSpeakerNameBox({
            name: state.dialogue.speakerName,
            screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT]
        }
    );

    const answerButtonPositions: RectArea[] = getAnswerButtonPositions(state);
    state.answerButtons = answerButtonPositions.map((position, index) => new DialogueAnswerButton({
        answer: SubstituteText(state.dialogue.answers[index], context),
        position: position,
    }));

    setSpeakerUI(state);
}

const setSpeakerUI = (state: DialoguePlayerState) => {
    if (state.speakerPortrait) {
        state.speakerImage = new DialogueSpeakerImage({
            speakerPortrait: state.speakerPortrait,
        });
    }
}

const getAnswerButtonPositions = (state: DialoguePlayerState): RectArea[] => {
    if (!DialogueService.asksUserForAnAnswer(state.dialogue)) {
        return [];
    }

    const buttonTop = ScreenDimensions.SCREEN_WIDTH * 0.9;
    const buttonHeight = ScreenDimensions.SCREEN_HEIGHT * 0.1;

    if (state.dialogue.answers.length == 1) {
        return [
            RectAreaService.new({
                left: 0,
                top: buttonTop,
                width: ScreenDimensions.SCREEN_WIDTH,
                height: buttonHeight
            })
        ];
    }

    const BUTTON_GAP_WHITESPACE_PERCENTAGE = 25;
    const BUTTON_GAP_PIXEL_MINIMUM = 50;

    let numberOfGaps = state.dialogue.answers.length - 1;
    let rawTotalButtonGapSpace = ScreenDimensions.SCREEN_WIDTH * BUTTON_GAP_WHITESPACE_PERCENTAGE / 100;

    let buttonGapWidth = rawTotalButtonGapSpace / numberOfGaps;
    if (buttonGapWidth < BUTTON_GAP_PIXEL_MINIMUM) {
        buttonGapWidth = BUTTON_GAP_PIXEL_MINIMUM;
    }

    let totalButtonGap = buttonGapWidth * (state.dialogue.answers.length - 1);
    let totalButtonSpace = ScreenDimensions.SCREEN_WIDTH - totalButtonGap;
    let buttonWidth = totalButtonSpace / state.dialogue.answers.length;

    return state.dialogue.answers.map((text, index): RectArea => {
        return RectAreaService.new({
            left: (buttonWidth + buttonGapWidth) * index,
            top: buttonTop,
            width: buttonWidth,
            height: buttonHeight
        });
    });
}
