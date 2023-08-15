import {SquaddieEmotion} from "../battle/animation/actionAnimation/actionAnimationConstants";

export class SquaddieResource {
    mapIconResourceKey: string;
    actionSpritesByEmotion: { [key in SquaddieEmotion]?: string };

    constructor({mapIconResourceKey, actionSpriteByEmotion}: {
        mapIconResourceKey?: string,
        actionSpriteByEmotion?: { [key in SquaddieEmotion]?: string }
    }) {
        this.mapIconResourceKey = mapIconResourceKey || "";
        this.actionSpritesByEmotion = actionSpriteByEmotion || {};
    }
};

