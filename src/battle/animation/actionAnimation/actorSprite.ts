import {
    ACTION_ANIMATION_ACTION_TIME,
    ACTION_ANIMATION_BEFORE_ACTION_TIME,
    ActionAnimationPhase,
    SquaddieEmotion,
    TSquaddieEmotion,
    TimeElapsedSinceAnimationStarted,
} from "./actionAnimationConstants"
import { ScreenDimensions } from "../../../utils/graphics/graphicsConfig"
import { ActionTimer } from "./actionTimer"
import { ResourceHandler } from "../../../resource/resourceHandler"
import { SquaddieSprite, SquaddieSpriteService } from "./squaddieSprite"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../objectRepository"
import { getResultOrThrowError } from "../../../utils/resultOrError"
import { RectAreaService } from "../../../ui/rectArea"
import {
    ActionEffectTemplate,
    ActionEffectTemplateService,
} from "../../../action/template/actionEffectTemplate"
import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"
import { BattleActionSquaddieChange } from "../../history/battleAction/battleActionSquaddieChange"
import { DegreeOfSuccess } from "../../calculator/actionCalculator/degreeOfSuccess"

export class ActorSprite {
    squaddieChanges: BattleActionSquaddieChange | undefined

    private _squaddieRepository: ObjectRepository | undefined

    get squaddieRepository(): ObjectRepository | undefined {
        return this._squaddieRepository
    }

    private _battleSquaddieId: string | undefined

    get battleSquaddieId(): string | undefined {
        return this._battleSquaddieId
    }

    private _sprite: SquaddieSprite | undefined

    get sprite(): SquaddieSprite | undefined {
        return this._sprite
    }

    private _startingPosition: number | undefined

    get startingPosition(): number | undefined {
        return this._startingPosition
    }

    reset() {
        this._startingPosition = undefined
        this._sprite = undefined
        this._battleSquaddieId = undefined
        this._squaddieRepository = undefined
        this.squaddieChanges = undefined
    }

    start({
        actorBattleSquaddieId,
        squaddieRepository,
        startingPosition,
        squaddieChanges,
    }: {
        actorBattleSquaddieId: string
        squaddieRepository: ObjectRepository
        startingPosition: number
        resourceHandler: ResourceHandler | undefined
        squaddieChanges: BattleActionSquaddieChange
    }) {
        this.reset()

        this._startingPosition = startingPosition
        this._squaddieRepository = squaddieRepository
        this._battleSquaddieId = actorBattleSquaddieId
        this.squaddieChanges = squaddieChanges

        if (
            this.squaddieRepository == undefined ||
            this.battleSquaddieId == undefined
        )
            return

        const { squaddieTemplate } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                this.squaddieRepository,
                this.battleSquaddieId
            )
        )

        this._sprite = SquaddieSpriteService.new({
            actionSpritesResourceKeysByEmotion: {
                ...squaddieTemplate.squaddieId.resources.actionSpritesByEmotion,
            },
        })
    }

    draw({
        timer,
        graphicsContext,
        actionEffectSquaddieTemplate,
        resourceHandler,
    }: {
        timer: ActionTimer | undefined
        graphicsContext: GraphicsBuffer
        actionEffectSquaddieTemplate: ActionEffectTemplate
        resourceHandler: ResourceHandler
    }) {
        if (timer == undefined) return
        if (timer.currentPhase === ActionAnimationPhase.INITIALIZED) {
            return
        }

        this.drawActorSprite(
            timer,
            graphicsContext,
            actionEffectSquaddieTemplate,
            resourceHandler
        )
    }

    getSquaddieImageBasedOnTimer(
        timer: ActionTimer | undefined,
        graphicsContext: GraphicsBuffer,
        action: ActionEffectTemplate
    ) {
        if (
            this.squaddieRepository == undefined ||
            this.battleSquaddieId == undefined ||
            this.sprite == undefined ||
            timer == undefined
        )
            return

        let emotion: TSquaddieEmotion = this.getSquaddieEmotion({
            timer,
            battleSquaddieId: this.battleSquaddieId,
            squaddieRepository: this.squaddieRepository,
            action,
        })

        return SquaddieSpriteService.getSpriteBasedOnEmotion({
            squaddieSprite: this.sprite,
            emotion,
            graphicsContext,
        })
    }

    public getSquaddieEmotion({
        timer,
        action,
    }: {
        timer: ActionTimer
        battleSquaddieId: string
        squaddieRepository: ObjectRepository
        action: ActionEffectTemplate
    }): TSquaddieEmotion {
        switch (timer.currentPhase) {
            case ActionAnimationPhase.DURING_ACTION:
            case ActionAnimationPhase.TARGET_REACTS:
            case ActionAnimationPhase.SHOWING_RESULTS:
            case ActionAnimationPhase.FINISHED_SHOWING_RESULTS:
                if (ActionEffectTemplateService.doesItTargetFoes(action)) {
                    return SquaddieEmotion.ATTACK
                } else if (
                    ActionEffectTemplateService.doesItTargetFriends(action)
                ) {
                    return SquaddieEmotion.ASSISTING
                } else {
                    return SquaddieEmotion.NEUTRAL
                }
            default:
                return SquaddieEmotion.NEUTRAL
        }
    }

    private drawActorSprite(
        timer: ActionTimer,
        graphicsContext: GraphicsBuffer,
        action: ActionEffectTemplate,
        resourceHandler: ResourceHandler
    ) {
        let spriteToDraw = this.getSquaddieImageBasedOnTimer(
            timer,
            graphicsContext,
            action
        )
        if (spriteToDraw == undefined || this.startingPosition == undefined)
            return
        let { horizontalDistance, verticalDistance } =
            this.getDistanceBasedOnTimer(timer)
        spriteToDraw.load(resourceHandler)
        if (!spriteToDraw.isImageLoaded()) return
        RectAreaService.move(spriteToDraw.drawArea, {
            left: this.startingPosition + horizontalDistance,
            top:
                ScreenDimensions.SCREEN_HEIGHT * 0.33 -
                spriteToDraw.drawArea.height +
                verticalDistance,
        })
        spriteToDraw.draw({ resourceHandler, graphicsContext })
    }

    private getDistanceBasedOnTimer(timer: ActionTimer) {
        if (
            timer?.startTime == undefined ||
            this.sprite == undefined ||
            this._startingPosition == undefined ||
            this.squaddieChanges == undefined
        )
            return { horizontalDistance: 0, verticalDistance: 0 }

        let horizontalDistance: number = 0
        let verticalDistance: number = 0
        const timeElapsed = TimeElapsedSinceAnimationStarted(timer.startTime)
        let maximumHorizontalDistance: number =
            (5 * ScreenDimensions.SCREEN_WIDTH) / 12 - this._startingPosition
        let maximumVerticalDistance: number = this.sprite.actionSpritesByEmotion
            .NEUTRAL
            ? this.sprite.actionSpritesByEmotion.NEUTRAL.drawArea.height / 16
            : ScreenDimensions.SCREEN_HEIGHT / 24
        let attackTime: number = 0

        switch (timer.currentPhase) {
            case ActionAnimationPhase.BEFORE_ACTION:
                break
            case ActionAnimationPhase.DURING_ACTION:
                attackTime = timeElapsed - ACTION_ANIMATION_BEFORE_ACTION_TIME
                if (
                    this.squaddieChanges.actorDegreeOfSuccess ===
                    DegreeOfSuccess.CRITICAL_SUCCESS
                ) {
                    const revUpTime = ACTION_ANIMATION_ACTION_TIME / 2
                    if (attackTime < revUpTime) {
                        const angle = (attackTime / revUpTime) * 8 * Math.PI
                        verticalDistance =
                            Math.sin(angle) * maximumVerticalDistance
                    } else {
                        const movementSpeed =
                            maximumHorizontalDistance /
                            (ACTION_ANIMATION_ACTION_TIME - revUpTime)
                        horizontalDistance =
                            movementSpeed * (attackTime - revUpTime)
                    }
                } else {
                    horizontalDistance =
                        maximumHorizontalDistance *
                        (attackTime / ACTION_ANIMATION_ACTION_TIME)
                }
                break
            case ActionAnimationPhase.TARGET_REACTS:
            case ActionAnimationPhase.SHOWING_RESULTS:
            case ActionAnimationPhase.FINISHED_SHOWING_RESULTS:
                horizontalDistance = maximumHorizontalDistance
        }
        return {
            horizontalDistance,
            verticalDistance,
        }
    }
}
