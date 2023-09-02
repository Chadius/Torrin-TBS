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
import {SquaddieActivity} from "../../../squaddie/activity";
import {ScreenDimensions} from "../../../utils/graphicsConfig";
import {ActionTimer} from "./actionTimer";
import {ResourceHandler} from "../../../resource/resourceHandler";
import {ActivityResult} from "../../history/activityResult";
import {SquaddieSprite} from "./squaddieSprite";
import {BattleSquaddieRepository} from "../../battleSquaddieRepository";
import {getResultOrThrowError} from "../../../utils/ResultOrError";
import {IsSquaddieAlive} from "../../../squaddie/squaddieService";

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

    private _dynamicSquaddieId: string;

    get dynamicSquaddieId(): string {
        return this._dynamicSquaddieId;
    }

    private _squaddieRepository: BattleSquaddieRepository;

    get squaddieRepository(): BattleSquaddieRepository {
        return this._squaddieRepository;
    }

    private _activityResult: ActivityResult;

    get activityResult(): ActivityResult {
        return this._activityResult;
    }

    reset() {
        this._sprite = undefined;
        this._dynamicSquaddieId = undefined;
        this._squaddieRepository = undefined;
        this._activityResult = undefined;
    }

    start({targetDynamicSquaddieId, squaddieRepository, activity, result, windowArea, resourceHandler}: {
        targetDynamicSquaddieId: string,
        squaddieRepository: BattleSquaddieRepository,
        activity: SquaddieActivity,
        result: ActivityResult,
        windowArea: RectArea,
        resourceHandler: ResourceHandler,
    }) {
        this.reset();

        this._startingPosition = windowArea.left;
        this._squaddieRepository = squaddieRepository;
        this._dynamicSquaddieId = targetDynamicSquaddieId;
        this._activityResult = result;

        const {staticSquaddie} = getResultOrThrowError(this.squaddieRepository.getSquaddieByDynamicId(this.dynamicSquaddieId));

        this._sprite = new SquaddieSprite({
            resourceHandler,
            actionSpritesResourceKeysByEmotion: {...staticSquaddie.squaddieId.resources.actionSpritesByEmotion},
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

    public getSquaddieEmotion({
                                  timer,
                                  dynamicSquaddieId,
                                  squaddieRepository,
                                  activityResult
                              }: {
        timer: ActionTimer,
        dynamicSquaddieId: string,
        squaddieRepository: BattleSquaddieRepository,
        activityResult: ActivityResult
    }): SquaddieEmotion {
        switch (timer.currentPhase) {
            case ActionAnimationPhase.DURING_ACTION:
                return SquaddieEmotion.TARGETED;
            case ActionAnimationPhase.TARGET_REACTS:
            case ActionAnimationPhase.SHOWING_RESULTS:
            case ActionAnimationPhase.FINISHED_SHOWING_RESULTS:
                const {
                    staticSquaddie,
                    dynamicSquaddie
                } = getResultOrThrowError(squaddieRepository.getSquaddieByDynamicId(dynamicSquaddieId));
                const stillAlive = IsSquaddieAlive({staticSquaddie, dynamicSquaddie});
                return stillAlive ? SquaddieEmotion.DAMAGED : SquaddieEmotion.DEAD;
            default:
                return SquaddieEmotion.NEUTRAL;
        }
    }

    getSquaddieImageBasedOnTimer(timer: ActionTimer, graphicsContext: p5) {
        let emotion: SquaddieEmotion = this.getSquaddieEmotion({
            timer,
            activityResult: this.activityResult,
            dynamicSquaddieId: this.dynamicSquaddieId,
            squaddieRepository: this.squaddieRepository
        });
        return this.sprite.getSpriteBasedOnEmotion(emotion, graphicsContext);
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
