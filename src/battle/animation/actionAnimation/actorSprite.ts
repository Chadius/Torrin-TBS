import {RectArea} from "../../../ui/rectArea";
import p5 from "p5";
import {
    ACTION_ANIMATION_ACTION_TIME,
    ACTION_ANIMATION_BEFORE_ACTION_TIME,
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
import {WINDOW_SPACING1} from "../../../ui/constants";
import {SquaddieSprite} from "./squaddieSprite";

export class ActorSprite {
    constructor() {

    }

    private _sprite: SquaddieSprite;

    get sprite(): SquaddieSprite {
        return this._sprite;
    }

    private _startingPosition: number;

    get startingPosition(): number {
        return this._startingPosition;
    }

    reset() {
        this._startingPosition = undefined;
    }

    start({actorStatic, actorDynamic, activity, resourceHandler, windowArea}: {
        actorStatic: BattleSquaddieStatic,
        actorDynamic: BattleSquaddieDynamic,
        activity: SquaddieActivity,
        resourceHandler: ResourceHandler,
        windowArea: RectArea,
    }) {
        this.reset();

        this._startingPosition = windowArea.right + WINDOW_SPACING1;

        this._sprite = new SquaddieSprite({
            resourceHandler,
            actionSpritesResourceKeysByEmotion: {...actorStatic.squaddieId.resources.actionSpritesByEmotion},
        });
        this.sprite.beginLoadingActorImages();
    }

    draw(timer: ActionTimer, graphicsContext: p5) {
        if (timer.currentPhase === ActionAnimationPhase.INITIALIZED) {
            return;
        }

        this.sprite.createActorImagesWithLoadedData();

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
        let maximumHorizontalDistance: number = (5 * ScreenDimensions.SCREEN_WIDTH / 12) - this._startingPosition;
        switch (timer.currentPhase) {
            case ActionAnimationPhase.BEFORE_ACTION:
                horizontalDistance = 0;
                break;
            case ActionAnimationPhase.DURING_ACTION:
                const attackTime = timeElapsed - ACTION_ANIMATION_BEFORE_ACTION_TIME;
                horizontalDistance =
                    maximumHorizontalDistance * (attackTime / ACTION_ANIMATION_ACTION_TIME);
                break;
            case ActionAnimationPhase.TARGET_REACTS:
            case ActionAnimationPhase.SHOWING_RESULTS:
            case ActionAnimationPhase.FINISHED_SHOWING_RESULTS:
                horizontalDistance = maximumHorizontalDistance;
        }
        return horizontalDistance;
    }
}
