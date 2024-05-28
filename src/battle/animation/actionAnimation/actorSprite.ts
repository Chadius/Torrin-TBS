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
import {ObjectRepository, ObjectRepositoryService} from "../../objectRepository";
import {getResultOrThrowError} from "../../../utils/ResultOrError";
import {RectAreaService} from "../../../ui/rectArea";
import {SquaddieSquaddieResults} from "../../history/squaddieSquaddieResults";
import {RollResultService} from "../../actionCalculator/rollResult";
import {
    ActionEffectSquaddieTemplate,
    ActionEffectSquaddieTemplateService
} from "../../../action/template/actionEffectSquaddieTemplate";
import {GraphicsBuffer} from "../../../utils/graphics/graphicsRenderer";

export class ActorSprite {
    squaddieResult: SquaddieSquaddieResults;

    constructor() {
    }

    private _squaddieRepository: ObjectRepository;

    get squaddieRepository(): ObjectRepository {
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
        squaddieRepository: ObjectRepository,
        startingPosition: number,
        resourceHandler: ResourceHandler,
        squaddieResult: SquaddieSquaddieResults,
    }) {
        this.reset();

        this._startingPosition = startingPosition;
        this._squaddieRepository = squaddieRepository;
        this._battleSquaddieId = actorBattleSquaddieId;
        this.squaddieResult = squaddieResult;

        const {squaddieTemplate} = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(this.squaddieRepository, this.battleSquaddieId));

        this._sprite = new SquaddieSprite({
            resourceHandler,
            actionSpritesResourceKeysByEmotion: {...squaddieTemplate.squaddieId.resources.actionSpritesByEmotion},
        });
        this.sprite.beginLoadingActorImages();
    }

    draw({timer, graphicsContext, actionEffectSquaddieTemplate,}: {
        timer: ActionTimer,
        graphicsContext: GraphicsBuffer,
        actionEffectSquaddieTemplate: ActionEffectSquaddieTemplate,
    }) {
        if (timer.currentPhase === ActionAnimationPhase.INITIALIZED) {
            return;
        }

        this.sprite.createActorImagesWithLoadedData();

        this.drawActorSprite(timer, graphicsContext, actionEffectSquaddieTemplate);
    }

    getSquaddieImageBasedOnTimer(
        timer: ActionTimer,
        graphicsContext: GraphicsBuffer,
        action: ActionEffectSquaddieTemplate,
    ) {
        let emotion: SquaddieEmotion = this.getSquaddieEmotion({
            timer,
            battleSquaddieId: this.battleSquaddieId,
            squaddieRepository: this.squaddieRepository,
            action,
        });

        return this.sprite.getSpriteBasedOnEmotion(emotion, graphicsContext);
    }

    public getSquaddieEmotion({
                                  timer,
                                  battleSquaddieId,
                                  squaddieRepository,
                                  action,
                              }: {
        timer: ActionTimer,
        battleSquaddieId: string,
        squaddieRepository: ObjectRepository,
        action: ActionEffectSquaddieTemplate,
    }): SquaddieEmotion {
        switch (timer.currentPhase) {
            case ActionAnimationPhase.DURING_ACTION:
            case ActionAnimationPhase.TARGET_REACTS:
            case ActionAnimationPhase.SHOWING_RESULTS:
            case ActionAnimationPhase.FINISHED_SHOWING_RESULTS:
                if (ActionEffectSquaddieTemplateService.isHindering(action)) {
                    return SquaddieEmotion.ATTACK;
                } else if (ActionEffectSquaddieTemplateService.isHelpful(action)) {
                    return SquaddieEmotion.ASSISTING;
                } else {
                    return SquaddieEmotion.NEUTRAL;
                }
            default:
                return SquaddieEmotion.NEUTRAL;
        }
    }

    private drawActorSprite(
        timer: ActionTimer,
        graphicsContext: GraphicsBuffer,
        action: ActionEffectSquaddieTemplate,
    ) {
        let spriteToDraw = this.getSquaddieImageBasedOnTimer(
            timer,
            graphicsContext,
            action,
        );
        let {horizontalDistance, verticalDistance} = this.getDistanceBasedOnTimer(timer);
        RectAreaService.move(spriteToDraw.area, {
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
                if (RollResultService.isACriticalSuccess(this.squaddieResult.actingSquaddieRoll)) {
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
