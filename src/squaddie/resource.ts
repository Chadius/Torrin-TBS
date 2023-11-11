import {SquaddieEmotion} from "../battle/animation/actionAnimation/actionAnimationConstants";

export interface SquaddieResource {
    mapIconResourceKey: string;
    actionSpritesByEmotion: { [key in SquaddieEmotion]?: string };
}
