import { CutsceneActionPlayerType } from "../cutsceneAction"
import { isValidValue } from "../../utils/objectValidityCheck"
import { ResourceLocator, ResourceType } from "../../resource/resourceHandler"
import { DialogueFontStyle, DialoguePosition } from "./constants"

export interface Dialogue {
    type: CutsceneActionPlayerType.DIALOGUE
    id: string
    animationDuration: number
    answers?: string[]
    speakerPortraitResourceKey?: string
    speakerPortraitPosition?: DialoguePosition
    speakerName: string
    speakerNamePosition?: DialoguePosition
    speakerNameFontStyle?: DialogueFontStyle
    dialogueText: string
    dialogueTextPosition?: DialoguePosition
    dialogueTextFontStyle?: DialogueFontStyle
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
        speakerPortraitPosition?: DialoguePosition
        speakerName?: string
        speakerNamePosition?: DialoguePosition
        speakerNameFontStyle?: DialogueFontStyle
        dialogueText: string
        dialogueTextPosition?: DialoguePosition
        dialogueTextFontStyle?: DialogueFontStyle
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
                type: ResourceType.IMAGE,
                key: state.speakerPortraitResourceKey,
            },
        ]
    },
    asksUserForAnAnswer: (state: Dialogue): boolean => {
        return state.answers.length > 0
    },
}
