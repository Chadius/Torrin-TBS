import {
    ACTION_ANIMATION_ACTION_TIME,
    ACTION_ANIMATION_BEFORE_ACTION_TIME,
    ACTION_ANIMATION_TARGET_REACTS_TO_ACTION_TIME,
    ActionAnimationPhase,
    SquaddieEmotion,
    TimeElapsedSinceAnimationStarted
} from "./actionAnimationConstants";
import {SquaddieAction} from "../../../squaddie/action";
import {ScreenDimensions} from "../../../utils/graphics/graphicsConfig";
import {ActionTimer} from "./actionTimer";
import {ResourceHandler} from "../../../resource/resourceHandler";
import {ActionResultPerSquaddie} from "../../history/actionResultPerSquaddie";
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

    draw(timer: ActionTimer, graphicsContext: GraphicsContext) {
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
                return stillAlive ? SquaddieEmotion.DAMAGED : SquaddieEmotion.DEAD;
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

    private drawActorSprite(timer: ActionTimer, graphicsContext: GraphicsContext) {
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
