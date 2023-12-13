import {SquaddieEmotion} from "../battle/animation/actionAnimation/actionAnimationConstants";
import {isValidValue} from "../utils/validityCheck";

export interface SquaddieResource {
    mapIconResourceKey: string;
    actionSpritesByEmotion: { [key in SquaddieEmotion]?: string };
}

export const SquaddieResourceHelper = {
    new: () => {
        return {
            mapIconResourceKey: "",
            actionSpritesByEmotion: {},
        }
    },
    sanitize: (data: SquaddieResource) => {
        sanitize(data);
    }
}

const sanitize = (data: SquaddieResource) => {
    data.actionSpritesByEmotion = isValidValue(data.actionSpritesByEmotion) ? data.actionSpritesByEmotion : {};
}
