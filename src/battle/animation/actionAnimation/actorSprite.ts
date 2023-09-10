import {RectArea} from "../../../ui/rectArea";
import p5 from "p5";
import {
    ACTION_ANIMATION_ACTION_TIME,
    ACTION_ANIMATION_BEFORE_ACTION_TIME,
    ActionAnimationPhase,
    SquaddieEmotion,
    TimeElapsedSinceAnimationStarted
} from "./actionAnimationConstants";
import {ScreenDimensions} from "../../../utils/graphics/graphicsConfig";
import {ActionTimer} from "./actionTimer";
import {ResourceHandler} from "../../../resource/resourceHandler";
import {WINDOW_SPACING1} from "../../../ui/constants";
import {SquaddieSprite} from "./squaddieSprite";
import {BattleSquaddieRepository} from "../../battleSquaddieRepository";
import {getResultOrThrowError} from "../../../utils/ResultOrError";

export class ActorSprite {
    constructor() {

    }

    private _squaddieRepository: BattleSquaddieRepository;

    get squaddieRepository(): BattleSquaddieRepository {
        return this._squaddieRepository;
    }

    private _dynamicSquaddieId: string;

    get dynamicSquaddieId(): string {
        return this._dynamicSquaddieId;
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
        this._sprite = undefined;
        this._dynamicSquaddieId = undefined;
        this._squaddieRepository = undefined;
    }

    start({actorDynamicSquaddieId, squaddieRepository, windowArea, resourceHandler}: {
        actorDynamicSquaddieId: string,
        squaddieRepository: BattleSquaddieRepository,
        windowArea: RectArea,
        resourceHandler: ResourceHandler,
    }) {
        this.reset();

        this._startingPosition = windowArea.right + WINDOW_SPACING1;
        this._squaddieRepository = squaddieRepository;
        this._dynamicSquaddieId = actorDynamicSquaddieId;

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

        this.sprite.createActorImagesWithLoadedData();

        this.drawActorSprite(timer, graphicsContext);
    }

    getSquaddieImageBasedOnTimer(timer: ActionTimer, graphicsContext: p5) {
        let emotion: SquaddieEmotion = this.getSquaddieEmotion({
            timer,
            dynamicSquaddieId: this.dynamicSquaddieId,
            squaddieRepository: this.squaddieRepository
        });

        return this.sprite.getSpriteBasedOnEmotion(emotion, graphicsContext);
    }

    public getSquaddieEmotion({
                                  timer,
                                  dynamicSquaddieId,
                                  squaddieRepository,
                              }: {
        timer: ActionTimer,
        dynamicSquaddieId: string,
        squaddieRepository: BattleSquaddieRepository,
    }): SquaddieEmotion {
        switch (timer.currentPhase) {
            case ActionAnimationPhase.DURING_ACTION:
            case ActionAnimationPhase.TARGET_REACTS:
            case ActionAnimationPhase.SHOWING_RESULTS:
            case ActionAnimationPhase.FINISHED_SHOWING_RESULTS:
                return SquaddieEmotion.ATTACK;
            default:
                return SquaddieEmotion.NEUTRAL;
        }
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
