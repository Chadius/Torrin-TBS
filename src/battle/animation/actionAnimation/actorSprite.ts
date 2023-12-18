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
import {SquaddieSprite} from "./squaddieSprite";
import {BattleSquaddieRepository} from "../../battleSquaddieRepository";
import {getResultOrThrowError} from "../../../utils/ResultOrError";
import {GraphicsContext} from "../../../utils/graphics/graphicsContext";
import {RectAreaHelper} from "../../../ui/rectArea";
import {SquaddieSquaddieResults} from "../../history/squaddieSquaddieResults";
import {RollResultHelper} from "../../actionCalculator/rollResult";

export class ActorSprite {
    squaddieResult: SquaddieSquaddieResults;

    constructor() {

    }

    private _squaddieRepository: BattleSquaddieRepository;

    get squaddieRepository(): BattleSquaddieRepository {
        return this._squaddieRepository;
    }

    private _battleSquaddieId: string;

    get battleSquaddieId(): string {
        return this._battleSquaddieId;
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
        this._battleSquaddieId = undefined;
        this._squaddieRepository = undefined;
        this.squaddieResult = undefined;
    }

    start({actorBattleSquaddieId, squaddieRepository, startingPosition, resourceHandler, squaddieResult}: {
        actorBattleSquaddieId: string,
        squaddieRepository: BattleSquaddieRepository,
        startingPosition: number,
        resourceHandler: ResourceHandler,
        squaddieResult: SquaddieSquaddieResults,
    }) {
        this.reset();

        this._startingPosition = startingPosition;
        this._squaddieRepository = squaddieRepository;
        this._battleSquaddieId = actorBattleSquaddieId;
        this.squaddieResult = squaddieResult;

        const {squaddieTemplate} = getResultOrThrowError(this.squaddieRepository.getSquaddieByBattleId(this.battleSquaddieId));

        this._sprite = new SquaddieSprite({
            resourceHandler,
            actionSpritesResourceKeysByEmotion: {...squaddieTemplate.squaddieId.resources.actionSpritesByEmotion},
        });
        this.sprite.beginLoadingActorImages();
    }

    draw(timer: ActionTimer, graphicsContext: GraphicsContext) {
        if (timer.currentPhase === ActionAnimationPhase.INITIALIZED) {
            return;
        }

        this.sprite.createActorImagesWithLoadedData();

        this.drawActorSprite(timer, graphicsContext);
    }

    getSquaddieImageBasedOnTimer(timer: ActionTimer, graphicsContext: GraphicsContext) {
        let emotion: SquaddieEmotion = this.getSquaddieEmotion({
            timer,
            battleSquaddieId: this.battleSquaddieId,
            squaddieRepository: this.squaddieRepository
        });

        return this.sprite.getSpriteBasedOnEmotion(emotion, graphicsContext);
    }

    public getSquaddieEmotion({
                                  timer,
                                  battleSquaddieId,
                                  squaddieRepository,
                              }: {
        timer: ActionTimer,
        battleSquaddieId: string,
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

    private drawActorSprite(timer: ActionTimer, graphicsContext: GraphicsContext) {
        let spriteToDraw = this.getSquaddieImageBasedOnTimer(timer, graphicsContext);
        let {horizontalDistance, verticalDistance} = this.getDistanceBasedOnTimer(timer);
        RectAreaHelper.move(spriteToDraw.area, {
            left: this.startingPosition + horizontalDistance,
            top: ScreenDimensions.SCREEN_HEIGHT * 0.33 - spriteToDraw.area.height + verticalDistance,
        });
        spriteToDraw.draw(graphicsContext);
    }

    private getDistanceBasedOnTimer(timer: ActionTimer) {
        const timeElapsed = TimeElapsedSinceAnimationStarted(timer.startTime);

        let horizontalDistance: number = 0;
        let verticalDistance: number = 0;
        let maximumHorizontalDistance: number = (5 * ScreenDimensions.SCREEN_WIDTH / 12) - this._startingPosition;
        let maximumVerticalDistance: number = this.sprite.actionSpritesByEmotion.NEUTRAL ? this.sprite.actionSpritesByEmotion.NEUTRAL.area.height / 16 : ScreenDimensions.SCREEN_HEIGHT / 24;
        switch (timer.currentPhase) {
            case ActionAnimationPhase.BEFORE_ACTION:
                horizontalDistance = 0;
                break;
            case ActionAnimationPhase.DURING_ACTION:
                const attackTime = timeElapsed - ACTION_ANIMATION_BEFORE_ACTION_TIME;
                if (RollResultHelper.isACriticalSuccess(this.squaddieResult.actingSquaddieRoll)) {
                    const revUpTime = ACTION_ANIMATION_ACTION_TIME / 2;
                    if (attackTime < revUpTime) {
                        horizontalDistance = 0;
                        const angle = (attackTime / revUpTime) * 8 * Math.PI;
                        verticalDistance = Math.sin(angle) * maximumVerticalDistance;
                    } else {
                        const movementSpeed = maximumHorizontalDistance / (ACTION_ANIMATION_ACTION_TIME - revUpTime);
                        horizontalDistance = movementSpeed * (attackTime - revUpTime);
                    }
                } else {
                    horizontalDistance =
                        maximumHorizontalDistance * (attackTime / ACTION_ANIMATION_ACTION_TIME);
                }
                break;
            case ActionAnimationPhase.TARGET_REACTS:
            case ActionAnimationPhase.SHOWING_RESULTS:
            case ActionAnimationPhase.FINISHED_SHOWING_RESULTS:
                horizontalDistance = maximumHorizontalDistance;
        }
        return {
            horizontalDistance,
            verticalDistance,
        };
    }
}
