import {RectArea} from "../../../ui/rectArea";
import p5 from "p5";
import {
    ACTION_ANIMATION_ACTION_TIME,
    ACTION_ANIMATION_BEFORE_ACTION_TIME,
    ACTION_ANIMATION_TARGET_REACTS_TO_ACTION_TIME,
    ActionAnimationPhase,
    SquaddieEmotion,
    TimeElapsedSinceAnimationStarted
} from "./actionAnimationConstants";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../../battleSquaddie";
import {SquaddieActivity} from "../../../squaddie/activity";
import {ScreenDimensions} from "../../../utils/graphicsConfig";
import {ActionTimer} from "./actionTimer";
import {ResourceHandler} from "../../../resource/resourceHandler";
import {ImageUI} from "../../../ui/imageUI";
import {ActivityResult} from "../../history/activityResult";
import {SquaddieSprite} from "./squaddieSprite";

export class TargetSprite {
    constructor() {

    }

    private _startingPosition: number;

    get startingPosition(): number {
        return this._startingPosition;
    }

    private _sprite: SquaddieSprite;

    get sprite(): SquaddieSprite {
        return this._sprite;
    }

    reset() {
        this._sprite = undefined;
    }

    start({targetStatic, targetDynamic, activity, result, windowArea, resourceHandler}: {
        targetStatic: BattleSquaddieStatic,
        targetDynamic: BattleSquaddieDynamic,
        activity: SquaddieActivity,
        result: ActivityResult,
        windowArea: RectArea,
        resourceHandler: ResourceHandler,
    }) {
        this.reset();

        this._startingPosition = windowArea.left;

        this._sprite = new SquaddieSprite({
            resourceHandler,
            actionSpritesResourceKeysByEmotion: {...targetStatic.squaddieId.resources.actionSpritesByEmotion},
        });
        this.sprite.beginLoadingActorImages();
    }

    draw(timer: ActionTimer, graphicsContext: p5) {
        if (timer.currentPhase === ActionAnimationPhase.INITIALIZED) {
            return;
        }

        const justCreatedSpritesStatue = this.sprite.createActorImagesWithLoadedData();
        if (justCreatedSpritesStatue.justCreatedImages) {
            this._startingPosition -= this.sprite.getSpriteBasedOnEmotion(SquaddieEmotion.NEUTRAL, graphicsContext).area.width;
        }

        this.drawActorSprite(timer, graphicsContext);
    }

    getSquaddieImageBasedOnTimer(timer: ActionTimer, graphicsContext: p5) {
        let emotion: SquaddieEmotion = SquaddieEmotion.NEUTRAL;
        const spriteToDraw: ImageUI = this.sprite.getSpriteBasedOnEmotion(emotion, graphicsContext);
        return spriteToDraw;
    }

    private drawActorSprite(timer: ActionTimer, graphicsContext: p5) {
        let spriteToDraw = this.getSquaddieImageBasedOnTimer(timer, graphicsContext);
        let horizontalDistance = this.getDistanceBasedOnTimer(timer);
        spriteToDraw.area.move({
            left: this.startingPosition + horizontalDistance,
            top: ScreenDimensions.SCREEN_HEIGHT * 0.33 - spriteToDraw.area.height,
        });
        spriteToDraw.draw(graphicsContext);
    }

    private getDistanceBasedOnTimer(timer: ActionTimer) {
        const timeElapsed = TimeElapsedSinceAnimationStarted(timer.startTime);

        let horizontalDistance: number = 0;
        let maximumHorizontalDistance: number = (1 * ScreenDimensions.SCREEN_WIDTH / 12);
        switch (timer.currentPhase) {
            case ActionAnimationPhase.BEFORE_ACTION:
            case ActionAnimationPhase.DURING_ACTION:
                horizontalDistance = 0;
                break;
            case ActionAnimationPhase.TARGET_REACTS:
                const attackTime = timeElapsed - (ACTION_ANIMATION_BEFORE_ACTION_TIME + ACTION_ANIMATION_ACTION_TIME);
                if (attackTime < ACTION_ANIMATION_TARGET_REACTS_TO_ACTION_TIME) {
                    horizontalDistance =
                        maximumHorizontalDistance * (attackTime / ACTION_ANIMATION_TARGET_REACTS_TO_ACTION_TIME);
                } else {
                    horizontalDistance = maximumHorizontalDistance;
                }
                break;
            case ActionAnimationPhase.SHOWING_RESULTS:
            case ActionAnimationPhase.FINISHED_SHOWING_RESULTS:
                horizontalDistance = maximumHorizontalDistance;
                break;
        }
        return horizontalDistance;
    }
}
