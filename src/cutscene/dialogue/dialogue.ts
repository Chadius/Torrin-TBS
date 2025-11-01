import {
    CutsceneActionPlayerType,
    TCutsceneActionPlayerType,
} from "../cutsceneAction"
import { isValidValue } from "../../utils/objectValidityCheck"
import {
    DialogueFontStyle,
    TDialogueFontStyle,
    TDialoguePosition,
} from "./constants"
import { Resource, ResourceLocator } from "../../resource/resourceLocator.ts"

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
            animationDuration == undefined ? 0 : animationDuration,
        answers: isValidValue(answers) ? answers : [],
        backgroundColor,
        speakerPortraitPosition,
        speakerName: speakerName ?? "???",
        speakerNamePosition: speakerNamePosition,
        speakerNameFontStyle: speakerNameFontStyle || DialogueFontStyle.BLACK,
        dialogueText: dialogueText,
        dialogueTextPosition: dialogueTextPosition,
        dialogueTextFontStyle: dialogueTextFontStyle || DialogueFontStyle.BLACK,
    }),
    getResourceLocators: (state: Dialogue): ResourceLocator[] => {
        if (state.speakerPortraitResourceKey == undefined) {
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
        return (state.answers ?? []).length > 0
    },
}
