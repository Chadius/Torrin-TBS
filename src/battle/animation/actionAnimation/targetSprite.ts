import {
    ACTION_ANIMATION_ACTION_TIME,
    ACTION_ANIMATION_BEFORE_ACTION_TIME,
    ACTION_ANIMATION_TARGET_REACTS_TO_ACTION_TIME,
    ActionAnimationPhase,
    SquaddieEmotion,
    TimeElapsedSinceAnimationStarted,
} from "./actionAnimationConstants"
import { ScreenDimensions } from "../../../utils/graphics/graphicsConfig"
import { ActionTimer } from "./actionTimer"
import { ResourceHandler } from "../../../resource/resourceHandler"
import { SquaddieSprite } from "./squaddieSprite"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../objectRepository"
import { getResultOrThrowError } from "../../../utils/ResultOrError"
import { SquaddieService } from "../../../squaddie/squaddieService"
import { RectAreaService } from "../../../ui/rectArea"
import {
    DegreeOfSuccess,
    DegreeOfSuccessService,
} from "../../calculator/actionCalculator/degreeOfSuccess"
import {
    ActionEffectSquaddieTemplate,
    ActionEffectSquaddieTemplateService,
} from "../../../action/template/actionEffectSquaddieTemplate"
import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"
import {
    BattleActionSquaddieChange,
    BattleActionSquaddieChangeService,
} from "../../history/battleAction/battleActionSquaddieChange"

export class TargetSprite {
    private _startingPosition: number

    get startingPosition(): number {
        return this._startingPosition
    }

    private _sprite: SquaddieSprite

    get sprite(): SquaddieSprite {
        return this._sprite
    }

    private _battleSquaddieId: string

    get battleSquaddieId(): string {
        return this._battleSquaddieId
    }

    private _squaddieRepository: ObjectRepository

    get squaddieRepository(): ObjectRepository {
        return this._squaddieRepository
    }

    private _actionResult: BattleActionSquaddieChange

    get actionResult(): BattleActionSquaddieChange {
        return this._actionResult
    }

    reset() {
        this._sprite = undefined
        this._battleSquaddieId = undefined
        this._squaddieRepository = undefined
        this._actionResult = undefined
    }

    start({
        targetBattleSquaddieId,
        squaddieRepository,
        actionEffectSquaddieTemplate,
        result,
        startingPosition,
        resourceHandler,
    }: {
        targetBattleSquaddieId: string
        squaddieRepository: ObjectRepository
        actionEffectSquaddieTemplate: ActionEffectSquaddieTemplate
        result: BattleActionSquaddieChange
        startingPosition: number
        resourceHandler: ResourceHandler
    }) {
        this.reset()

        this._startingPosition = startingPosition
        this._squaddieRepository = squaddieRepository
        this._battleSquaddieId = targetBattleSquaddieId
        this._actionResult = result

        const { squaddieTemplate } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                this.squaddieRepository,
                this.battleSquaddieId
            )
        )

        this._sprite = new SquaddieSprite({
            resourceHandler,
            actionSpritesResourceKeysByEmotion: {
                ...squaddieTemplate.squaddieId.resources.actionSpritesByEmotion,
            },
        })
        this.sprite.beginLoadingActorImages()
    }

    draw(
        timer: ActionTimer,
        graphicsContext: GraphicsBuffer,
        actionEffectSquaddieTemplate: ActionEffectSquaddieTemplate,
        result: BattleActionSquaddieChange
    ) {
        if (timer.currentPhase === ActionAnimationPhase.INITIALIZED) {
            return
        }

        const justCreatedSpritesStatue =
            this.sprite.createActorImagesWithLoadedData()
        if (justCreatedSpritesStatue.justCreatedImages) {
            this._startingPosition -= this.sprite.getSpriteBasedOnEmotion(
                SquaddieEmotion.NEUTRAL,
                graphicsContext
            ).area.width
        }

        this.drawActorSprite(
            timer,
            graphicsContext,
            actionEffectSquaddieTemplate,
            result
        )
    }

    public getSquaddieEmotion({
        timer,
        battleSquaddieId,
        squaddieRepository,
        result,
        actionEffectSquaddieTemplateService,
    }: {
        timer: ActionTimer
        battleSquaddieId: string
        squaddieRepository: ObjectRepository
        result: BattleActionSquaddieChange
        actionEffectSquaddieTemplateService: ActionEffectSquaddieTemplate
    }): SquaddieEmotion {
        const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                squaddieRepository,
                battleSquaddieId
            )
        )
        const stillAlive = SquaddieService.isSquaddieAlive({
            squaddieTemplate,
            battleSquaddie,
        })
        switch (timer.currentPhase) {
            case ActionAnimationPhase.DURING_ACTION:
                if (
                    ActionEffectSquaddieTemplateService.doesItTargetFoes(
                        actionEffectSquaddieTemplateService
                    )
                ) {
                    return SquaddieEmotion.TARGETED
                }
                return SquaddieEmotion.NEUTRAL
            case ActionAnimationPhase.TARGET_REACTS:
            case ActionAnimationPhase.SHOWING_RESULTS:
            case ActionAnimationPhase.FINISHED_SHOWING_RESULTS:
                if (!stillAlive) {
                    return SquaddieEmotion.DEAD
                }

                if (
                    !DegreeOfSuccessService.atLeastSuccessful(
                        result.actorDegreeOfSuccess
                    )
                ) {
                    return SquaddieEmotion.NEUTRAL
                }

                if (
                    !BattleActionSquaddieChangeService.isSquaddieHindered(
                        result
                    ) &&
                    !BattleActionSquaddieChangeService.isSquaddieHelped(result)
                ) {
                    return SquaddieEmotion.NEUTRAL
                } else if (
                    BattleActionSquaddieChangeService.isSquaddieHindered(result)
                ) {
                    return SquaddieEmotion.DAMAGED
                } else {
                    return SquaddieEmotion.THANKFUL
                }
            default:
                return SquaddieEmotion.NEUTRAL
        }
    }

    getSquaddieImageBasedOnTimer(
        timer: ActionTimer,
        graphicsContext: GraphicsBuffer,
        actionEffectSquaddieTemplate: ActionEffectSquaddieTemplate
    ) {
        let emotion: SquaddieEmotion = this.getSquaddieEmotion({
            timer,
            result: this.actionResult,
            battleSquaddieId: this.battleSquaddieId,
            squaddieRepository: this.squaddieRepository,
            actionEffectSquaddieTemplateService: actionEffectSquaddieTemplate,
        })
        return this.sprite.getSpriteBasedOnEmotion(emotion, graphicsContext)
    }

    private drawActorSprite(
        timer: ActionTimer,
        graphicsContext: GraphicsBuffer,
        actionEffectSquaddieTemplateService: ActionEffectSquaddieTemplate,
        result: BattleActionSquaddieChange
    ) {
        let spriteToDraw = this.getSquaddieImageBasedOnTimer(
            timer,
            graphicsContext,
            actionEffectSquaddieTemplateService
        )
        let horizontalDistance: number = 0
        let verticalDistance: number = 0

        const emotion = this.getSquaddieEmotion({
            timer,
            battleSquaddieId: this.battleSquaddieId,
            squaddieRepository: this.squaddieRepository,
            result,
            actionEffectSquaddieTemplateService:
                actionEffectSquaddieTemplateService,
        })

        if (
            [
                ActionAnimationPhase.BEFORE_ACTION,
                ActionAnimationPhase.DURING_ACTION,
            ].includes(timer.currentPhase)
        ) {
            ;({ horizontalDistance, verticalDistance } =
                this.getSpritePositionBeforeActionAndDuringAction(
                    timer,
                    emotion
                ))
        } else if (
            ActionEffectSquaddieTemplateService.doesItTargetFoes(
                actionEffectSquaddieTemplateService
            )
        ) {
            if (
                DegreeOfSuccessService.atLeastSuccessful(
                    result.actorDegreeOfSuccess
                ) &&
                result.damage.net > 0
            ) {
                ;({ horizontalDistance, verticalDistance } =
                    this.getSpritePositionTargetReactsAndTakesDamage(
                        timer,
                        emotion
                    ))
            } else if (
                DegreeOfSuccessService.atLeastSuccessful(
                    result.actorDegreeOfSuccess
                ) &&
                result.damage.net === 0
            ) {
                ;({ horizontalDistance, verticalDistance } =
                    this.getSpritePositionTargetReactsAndNoDamage(
                        timer,
                        emotion
                    ))
            }
            if (result.actorDegreeOfSuccess === DegreeOfSuccess.FAILURE) {
                ;({ horizontalDistance, verticalDistance } =
                    this.getSpritePositionTargetReactsAndMisses(timer))
            }
        }

        RectAreaService.move(spriteToDraw.area, {
            left: this.startingPosition + horizontalDistance,
            top:
                ScreenDimensions.SCREEN_HEIGHT * 0.33 -
                spriteToDraw.area.height +
                verticalDistance,
        })
        spriteToDraw.draw(graphicsContext)
    }

    private getSpritePositionBeforeActionAndDuringAction(
        timer: ActionTimer,
        emotion: SquaddieEmotion
    ): {
        horizontalDistance: number
        verticalDistance: number
    } {
        return {
            horizontalDistance: 0,
            verticalDistance: 0,
        }
    }

    private getSpritePositionTargetReactsAndTakesDamage(
        timer: ActionTimer,
        emotion: SquaddieEmotion
    ): {
        horizontalDistance: number
        verticalDistance: number
    } {
        const timeElapsed = TimeElapsedSinceAnimationStarted(timer.startTime)
        let horizontalDistance: number = 0
        let verticalDistance: number = 0
        let maximumHorizontalDistance: number =
            ScreenDimensions.SCREEN_WIDTH / 12
        let maximumVerticalDistance: number = this.sprite.actionSpritesByEmotion
            .NEUTRAL
            ? this.sprite.actionSpritesByEmotion.NEUTRAL.area.height / 8
            : ScreenDimensions.SCREEN_HEIGHT / 24
        const attackTime = getAttackTime(timeElapsed)
        switch (timer.currentPhase) {
            case ActionAnimationPhase.TARGET_REACTS:
                if (
                    attackTime < ACTION_ANIMATION_TARGET_REACTS_TO_ACTION_TIME
                ) {
                    horizontalDistance =
                        maximumHorizontalDistance *
                        (attackTime /
                            ACTION_ANIMATION_TARGET_REACTS_TO_ACTION_TIME)
                } else {
                    horizontalDistance = maximumHorizontalDistance
                }

                if (
                    attackTime <
                        ACTION_ANIMATION_TARGET_REACTS_TO_ACTION_TIME &&
                    emotion !== SquaddieEmotion.DEAD
                ) {
                    const angle =
                        (attackTime /
                            ACTION_ANIMATION_TARGET_REACTS_TO_ACTION_TIME) *
                        2 *
                        Math.PI
                    verticalDistance = Math.sin(angle) * maximumVerticalDistance
                }
                break
            case ActionAnimationPhase.SHOWING_RESULTS:
            case ActionAnimationPhase.FINISHED_SHOWING_RESULTS:
                horizontalDistance = maximumHorizontalDistance
                break
        }

        return {
            horizontalDistance,
            verticalDistance,
        }
    }

    private getSpritePositionTargetReactsAndNoDamage(
        timer: ActionTimer,
        emotion: SquaddieEmotion
    ): {
        horizontalDistance: number
        verticalDistance: number
    } {
        const timeElapsed = TimeElapsedSinceAnimationStarted(timer.startTime)

        let horizontalDistance: number = 0
        let maximumHorizontalDistance: number =
            ScreenDimensions.SCREEN_WIDTH / 24
        const attackTime = getAttackTime(timeElapsed)
        switch (timer.currentPhase) {
            case ActionAnimationPhase.TARGET_REACTS:
                if (
                    attackTime <
                    ACTION_ANIMATION_TARGET_REACTS_TO_ACTION_TIME / 10
                ) {
                    horizontalDistance =
                        maximumHorizontalDistance *
                        (attackTime /
                            (ACTION_ANIMATION_TARGET_REACTS_TO_ACTION_TIME /
                                10))
                } else {
                    horizontalDistance = maximumHorizontalDistance
                }
                break
            case ActionAnimationPhase.SHOWING_RESULTS:
            case ActionAnimationPhase.FINISHED_SHOWING_RESULTS:
                horizontalDistance = maximumHorizontalDistance
                break
        }

        return {
            horizontalDistance,
            verticalDistance: 0,
        }
    }

    private getSpritePositionTargetReactsAndMisses(timer: ActionTimer): {
        horizontalDistance: number
        verticalDistance: number
    } {
        const timeElapsed = TimeElapsedSinceAnimationStarted(timer.startTime)

        let horizontalDistance: number = 0
        let maximumHorizontalDistance: number =
            ScreenDimensions.SCREEN_WIDTH / 24
        const attackTime = getAttackTime(timeElapsed)
        switch (timer.currentPhase) {
            case ActionAnimationPhase.TARGET_REACTS:
                if (
                    attackTime < ACTION_ANIMATION_TARGET_REACTS_TO_ACTION_TIME
                ) {
                    const angle =
                        (attackTime /
                            ACTION_ANIMATION_TARGET_REACTS_TO_ACTION_TIME) *
                        Math.PI
                    horizontalDistance =
                        Math.sin(angle) * maximumHorizontalDistance
                }
                break
            case ActionAnimationPhase.SHOWING_RESULTS:
            case ActionAnimationPhase.FINISHED_SHOWING_RESULTS:
                break
        }

        return {
            horizontalDistance,
            verticalDistance: 0,
        }
    }
}

const getAttackTime = (timeElapsed: number): number =>
    timeElapsed -
    (ACTION_ANIMATION_BEFORE_ACTION_TIME + ACTION_ANIMATION_ACTION_TIME)
