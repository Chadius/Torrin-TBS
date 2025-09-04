import {
    CutsceneActionPlayerType,
    TCutsceneActionPlayerType,
} from "../cutsceneAction"
import { isValidValue } from "../../utils/objectValidityCheck"
import { ResourceLocator, Resource } from "../../resource/resourceHandler"
import {
    DialogueFontStyle,
    TDialogueFontStyle,
    DialoguePosition,
    TDialoguePosition,
} from "./constants"

export interface Dialogue {
    type: TCutsceneActionPlayerType
    id: string
    animationDuration: number
    answers?: string[]
    speakerPortraitResourceKey?: string
    speakerPortraitPosition?: TDialoguePosition
    speakerName: string
    speakerNamePosition?: TDialoguePosition
    speakerNameFontStyle?: TDialogueFontStyle
    dialogueText: string
    dialogueTextPosition?: TDialoguePosition
    dialogueTextFontStyle?: TDialogueFontStyle
    backgroundColor?: [number, number, number]
}

export const DialogueService = {
    new: ({
        id,
        speakerPortraitResourceKey,
        speakerPortraitPosition,
        animationDuration,
        answers,
        dialogueText,
        dialogueTextPosition,
        dialogueTextFontStyle,
        speakerName,
        speakerNameFontStyle,
        speakerNamePosition,
        backgroundColor,
    }: {
        id: string
        animationDuration?: number
        answers?: string[]
        backgroundColor?: [number, number, number]
        speakerPortraitResourceKey?: string
        speakerPortraitPosition?: TDialoguePosition
        speakerName?: string
        speakerNamePosition?: TDialoguePosition
        speakerNameFontStyle?: TDialogueFontStyle
        dialogueText: string
        dialogueTextPosition?: TDialoguePosition
        dialogueTextFontStyle?: TDialogueFontStyle
    }): Dialogue => ({
        type: CutsceneActionPlayerType.DIALOGUE,
        id,
        speakerPortraitResourceKey,
        animationDuration:
            isValidValue(animationDuration) || animationDuration === 0
                ? animationDuration
                : 0,
        answers: isValidValue(answers) ? answers : [],
        backgroundColor,
        speakerPortraitPosition:
            speakerPortraitPosition || DialoguePosition.CENTER,
        speakerName: speakerName,
        speakerNamePosition: speakerNamePosition || DialoguePosition.CENTER,
        speakerNameFontStyle: speakerNameFontStyle || DialogueFontStyle.BLACK,
        dialogueText: dialogueText,
        dialogueTextPosition: dialogueTextPosition || DialoguePosition.CENTER,
        dialogueTextFontStyle: dialogueTextFontStyle || DialogueFontStyle.BLACK,
    }),
    getResourceLocators: (state: Dialogue): ResourceLocator[] => {
        if (!isValidValue(state.speakerPortraitResourceKey)) {
            return []
        }

        return [
            {
                type: Resource.IMAGE,
                key: state.speakerPortraitResourceKey,
            },
        ]
    },
    asksUserForAnAnswer: (state: Dialogue): boolean => {
        return state.answers.length > 0
    },
}
