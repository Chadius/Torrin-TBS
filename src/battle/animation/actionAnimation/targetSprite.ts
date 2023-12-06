import {
    ACTION_ANIMATION_ACTION_TIME,
    ACTION_ANIMATION_BEFORE_ACTION_TIME,
    ACTION_ANIMATION_TARGET_REACTS_TO_ACTION_TIME,
    ActionAnimationPhase,
    SquaddieEmotion,
    TimeElapsedSinceAnimationStarted
} from "./actionAnimationConstants";
import {SquaddieAction, SquaddieActionHandler} from "../../../squaddie/action";
import {ScreenDimensions} from "../../../utils/graphics/graphicsConfig";
import {ActionTimer} from "./actionTimer";
import {ResourceHandler} from "../../../resource/resourceHandler";
import {ActionResultPerSquaddie, DegreeOfSuccess, DegreeOfSuccessHelper} from "../../history/actionResultPerSquaddie";
import {SquaddieSprite} from "./squaddieSprite";
import {BattleSquaddieRepository} from "../../battleSquaddieRepository";
import {getResultOrThrowError} from "../../../utils/ResultOrError";
import {IsSquaddieAlive} from "../../../squaddie/squaddieService";
import {GraphicsContext} from "../../../utils/graphics/graphicsContext";

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

    private _battleSquaddieId: string;

    get battleSquaddieId(): string {
        return this._battleSquaddieId;
    }

    private _squaddieRepository: BattleSquaddieRepository;

    get squaddieRepository(): BattleSquaddieRepository {
        return this._squaddieRepository;
    }

    private _actionResult: ActionResultPerSquaddie;

    get actionResult(): ActionResultPerSquaddie {
        return this._actionResult;
    }

    reset() {
        this._sprite = undefined;
        this._battleSquaddieId = undefined;
        this._squaddieRepository = undefined;
        this._actionResult = undefined;
    }

    start({targetBattleSquaddieId, squaddieRepository, action, result, startingPosition, resourceHandler}: {
        targetBattleSquaddieId: string,
        squaddieRepository: BattleSquaddieRepository,
        action: SquaddieAction,
        result: ActionResultPerSquaddie,
        startingPosition: number,
        resourceHandler: ResourceHandler,
    }) {
        this.reset();

        this._startingPosition = startingPosition;
        this._squaddieRepository = squaddieRepository;
        this._battleSquaddieId = targetBattleSquaddieId;
        this._actionResult = result;

        const {squaddieTemplate} = getResultOrThrowError(this.squaddieRepository.getSquaddieByBattleId(this.battleSquaddieId));

        this._sprite = new SquaddieSprite({
            resourceHandler,
            actionSpritesResourceKeysByEmotion: {...squaddieTemplate.squaddieId.resources.actionSpritesByEmotion},
        });
        this.sprite.beginLoadingActorImages();
    }

    draw(timer: ActionTimer, graphicsContext: GraphicsContext, action: SquaddieAction, result: ActionResultPerSquaddie) {
        if (timer.currentPhase === ActionAnimationPhase.INITIALIZED) {
            return;
        }

        const justCreatedSpritesStatue = this.sprite.createActorImagesWithLoadedData();
        if (justCreatedSpritesStatue.justCreatedImages) {
            this._startingPosition -= this.sprite.getSpriteBasedOnEmotion(SquaddieEmotion.NEUTRAL, graphicsContext).area.width;
        }

        this.drawActorSprite(timer, graphicsContext, action, result);
    }

    public getSquaddieEmotion({
                                  timer,
                                  battleSquaddieId,
                                  squaddieRepository,
                                  result
                              }: {
        timer: ActionTimer,
        battleSquaddieId: string,
        squaddieRepository: BattleSquaddieRepository,
        result: ActionResultPerSquaddie
    }): SquaddieEmotion {
        switch (timer.currentPhase) {
            case ActionAnimationPhase.DURING_ACTION:
                return SquaddieEmotion.TARGETED;
            case ActionAnimationPhase.TARGET_REACTS:
            case ActionAnimationPhase.SHOWING_RESULTS:
            case ActionAnimationPhase.FINISHED_SHOWING_RESULTS:
                const {
                    squaddieTemplate,
                    battleSquaddie
                } = getResultOrThrowError(squaddieRepository.getSquaddieByBattleId(battleSquaddieId));
                const stillAlive = IsSquaddieAlive({squaddieTemplate, battleSquaddie});
                if (!stillAlive) {
                    return SquaddieEmotion.DEAD;
                }

                if (!DegreeOfSuccessHelper.atLeastSuccessful(result.actorDegreeOfSuccess)) {
                    return SquaddieEmotion.NEUTRAL;
                }

                if (result.damageTaken === 0) {
                    return SquaddieEmotion.NEUTRAL;
                }

                return SquaddieEmotion.DAMAGED;
            default:
                return SquaddieEmotion.NEUTRAL;
        }
    }

    getSquaddieImageBasedOnTimer(timer: ActionTimer, graphicsContext: GraphicsContext) {
        let emotion: SquaddieEmotion = this.getSquaddieEmotion({
            timer,
            result: this.actionResult,
            battleSquaddieId: this.battleSquaddieId,
            squaddieRepository: this.squaddieRepository
        });
        return this.sprite.getSpriteBasedOnEmotion(emotion, graphicsContext);
    }

    private drawActorSprite(timer: ActionTimer, graphicsContext: GraphicsContext, action: SquaddieAction, result: ActionResultPerSquaddie) {
        let spriteToDraw = this.getSquaddieImageBasedOnTimer(timer, graphicsContext);
        let horizontalDistance: number = 0;
        let verticalDistance: number = 0;

        const emotion = this.getSquaddieEmotion({
            timer,
            battleSquaddieId: this.battleSquaddieId,
            squaddieRepository: this.squaddieRepository,
            result
        });

        if ([ActionAnimationPhase.BEFORE_ACTION,
            ActionAnimationPhase.DURING_ACTION,
        ].includes(timer.currentPhase)) {
            ({
                horizontalDistance,
                verticalDistance
            } = this.getSpritePositionBeforeActionAndDuringAction(timer, emotion));
        } else if (SquaddieActionHandler.isHindering(action)) {
            if (result.actorDegreeOfSuccess === DegreeOfSuccess.SUCCESS && result.damageTaken > 0) {
                ({
                    horizontalDistance,
                    verticalDistance
                } = this.getSpritePositionTargetReactsAndTakesDamage(timer, emotion));
            } else if (result.actorDegreeOfSuccess === DegreeOfSuccess.SUCCESS && result.damageTaken === 0) {
                ({
                    horizontalDistance,
                    verticalDistance
                } = this.getSpritePositionTargetReactsAndNoDamage(timer, emotion));
            }
            if (result.actorDegreeOfSuccess === DegreeOfSuccess.FAILURE) {
                ({horizontalDistance, verticalDistance} = this.getSpritePositionTargetReactsAndMisses(timer));
            }
        }

        spriteToDraw.area.move({
            left: this.startingPosition + horizontalDistance,
            top: ScreenDimensions.SCREEN_HEIGHT * 0.33 - spriteToDraw.area.height + verticalDistance,
        });
        spriteToDraw.draw(graphicsContext);
    }

    private getSpritePositionBeforeActionAndDuringAction(timer: ActionTimer, emotion: SquaddieEmotion): {
        horizontalDistance: number;
        verticalDistance: number
    } {
        return {
            horizontalDistance: 0,
            verticalDistance: 0,
        }
    }

    private getSpritePositionTargetReactsAndTakesDamage(timer: ActionTimer, emotion: SquaddieEmotion): {
        horizontalDistance: number;
        verticalDistance: number
    } {
        const timeElapsed = TimeElapsedSinceAnimationStarted(timer.startTime);

        let horizontalDistance: number = 0;
        let verticalDistance: number = 0;
        let maximumHorizontalDistance: number = ScreenDimensions.SCREEN_WIDTH / 12;
        let maximumVerticalDistance: number = this.sprite.actionSpritesByEmotion.NEUTRAL ? this.sprite.actionSpritesByEmotion.NEUTRAL.area.height / 8 : ScreenDimensions.SCREEN_HEIGHT / 24;
        switch (timer.currentPhase) {
            case ActionAnimationPhase.TARGET_REACTS:
                const attackTime = timeElapsed - (ACTION_ANIMATION_BEFORE_ACTION_TIME + ACTION_ANIMATION_ACTION_TIME);
                if (attackTime < ACTION_ANIMATION_TARGET_REACTS_TO_ACTION_TIME) {
                    horizontalDistance =
                        maximumHorizontalDistance * (attackTime / ACTION_ANIMATION_TARGET_REACTS_TO_ACTION_TIME);
                } else {
                    horizontalDistance = maximumHorizontalDistance;
                }

                if (attackTime < ACTION_ANIMATION_TARGET_REACTS_TO_ACTION_TIME && emotion !== SquaddieEmotion.DEAD) {
                    const angle = (attackTime / ACTION_ANIMATION_TARGET_REACTS_TO_ACTION_TIME) * 2 * Math.PI;
                    verticalDistance = Math.sin(angle) * maximumVerticalDistance;
                } else {
                    verticalDistance = 0;
                }
                break;
            case ActionAnimationPhase.SHOWING_RESULTS:
            case ActionAnimationPhase.FINISHED_SHOWING_RESULTS:
                horizontalDistance = maximumHorizontalDistance;
                verticalDistance = 0;
                break;
        }

        return {
            horizontalDistance,
            verticalDistance,
        }
    }

    private getSpritePositionTargetReactsAndNoDamage(timer: ActionTimer, emotion: SquaddieEmotion): {
        horizontalDistance: number;
        verticalDistance: number
    } {
        const timeElapsed = TimeElapsedSinceAnimationStarted(timer.startTime);

        let horizontalDistance: number = 0;
        let maximumHorizontalDistance: number = ScreenDimensions.SCREEN_WIDTH / 24;
        switch (timer.currentPhase) {
            case ActionAnimationPhase.TARGET_REACTS:
                const attackTime = timeElapsed - (ACTION_ANIMATION_BEFORE_ACTION_TIME + ACTION_ANIMATION_ACTION_TIME);
                if (attackTime < ACTION_ANIMATION_TARGET_REACTS_TO_ACTION_TIME / 10) {
                    horizontalDistance =
                        maximumHorizontalDistance * (attackTime / (ACTION_ANIMATION_TARGET_REACTS_TO_ACTION_TIME / 10));
                } else {
                    horizontalDistance = maximumHorizontalDistance;
                }
                break;
            case ActionAnimationPhase.SHOWING_RESULTS:
            case ActionAnimationPhase.FINISHED_SHOWING_RESULTS:
                horizontalDistance = maximumHorizontalDistance;
                break;
        }

        return {
            horizontalDistance,
            verticalDistance: 0,
        }
    }

    private getSpritePositionTargetReactsAndMisses(timer: ActionTimer): {
        horizontalDistance: number,
        verticalDistance: number
    } {
        const timeElapsed = TimeElapsedSinceAnimationStarted(timer.startTime);

        let horizontalDistance: number = 0;
        let maximumHorizontalDistance: number = ScreenDimensions.SCREEN_WIDTH / 24;
        switch (timer.currentPhase) {
            case ActionAnimationPhase.TARGET_REACTS:
                const attackTime = timeElapsed - (ACTION_ANIMATION_BEFORE_ACTION_TIME + ACTION_ANIMATION_ACTION_TIME);
                if (attackTime < ACTION_ANIMATION_TARGET_REACTS_TO_ACTION_TIME) {
                    const angle = (attackTime / ACTION_ANIMATION_TARGET_REACTS_TO_ACTION_TIME) * Math.PI;
                    horizontalDistance = Math.sin(angle) * maximumHorizontalDistance;
                } else {
                    horizontalDistance = 0;
                }
                break;
            case ActionAnimationPhase.SHOWING_RESULTS:
            case ActionAnimationPhase.FINISHED_SHOWING_RESULTS:
                horizontalDistance = 0;
                break;
        }

        return {
            horizontalDistance,
            verticalDistance: 0,
        }
    }
}
