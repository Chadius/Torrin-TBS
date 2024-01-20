import {CutsceneActionPlayerType} from "../cutsceneAction";
import {isValidValue} from "../../utils/validityCheck";
import {ResourceLocator, ResourceType} from "../../resource/resourceHandler";

export interface Dialogue {
    type: CutsceneActionPlayerType.DIALOGUE;
    id: string;
    animationDuration: number;
    answers?: string[];
    speakerPortraitResourceKey?: string;
    speakerText: string;
    speakerName: string;
}

export const DialogueService = {
    new: ({
              id,
              speakerPortraitResourceKey,
              animationDuration,
              answers,
              speakerText,
              speakerName,
          }: {
        id: string;
        speakerPortraitResourceKey?: string;
        animationDuration?: number;
        answers?: string[];
        speakerText: string;
        speakerName?: string;
    }): Dialogue => {
        return {
            type: CutsceneActionPlayerType.DIALOGUE,
            id,
            speakerPortraitResourceKey,
            animationDuration: isValidValue(animationDuration) || animationDuration === 0
                ? animationDuration
                : 0,
            answers: isValidValue(answers)
                ? answers
                : [],
            speakerName: speakerName,
            speakerText: speakerText,
        }
    },
    getResourceLocators: (state: Dialogue): ResourceLocator[] => {
        if (!isValidValue(state.speakerPortraitResourceKey)) {
            return []
        }

        return [
            {
                type: ResourceType.IMAGE,
                key: state.speakerPortraitResourceKey
            }
        ]
    },
    asksUserForAnAnswer: (state: Dialogue): boolean => {
        return state.answers.length > 0;
    },
}
