import {
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType,
} from "../orchestrator/battleOrchestratorComponent"
import { ActionAnimationPhase } from "./actionAnimation/actionAnimationConstants"
import { ActionTimer } from "./actionAnimation/actionTimer"
import { ActorTextWindow } from "./actionAnimation/actorTextWindow"
import { WeaponIcon } from "./actionAnimation/weaponIcon"
import { ActorSprite } from "./actionAnimation/actorSprite"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { TargetSprite } from "./actionAnimation/targetSprite"
import { TargetTextWindow } from "./actionAnimation/targetTextWindow"
import { HitPointMeter } from "./actionAnimation/hitPointMeter"
import { GetHitPoints } from "../../squaddie/squaddieService"
import { WINDOW_SPACING } from "../../ui/constants"
import { HUE_BY_SQUADDIE_AFFILIATION } from "../../graphicsConstants"
import { SquaddieActionAnimator } from "./squaddieActionAnimator"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import { RectAreaService } from "../../ui/rectArea"
import { ObjectRepositoryService } from "../objectRepository"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { ActionEffectSquaddieTemplate } from "../../action/template/actionEffectSquaddieTemplate"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { BattleActionSquaddieChange } from "../history/battleActionSquaddieChange"
import { BattleAction, BattleActionService } from "../history/battleAction"
import { BattleActionQueueService } from "../history/battleActionQueue"
import { SquaddieSquaddieResultsService } from "../history/squaddieSquaddieResults"
import { BattleActionRecorderService } from "../history/battleActionRecorder"

export class SquaddieTargetsOtherSquaddiesAnimator
    implements SquaddieActionAnimator
{
    sawResultAftermath: boolean
    private startedShowingResults: boolean
    private _userRequestedAnimationSkip: boolean

    constructor() {
        this.resetInternalState()
    }

    private _actionAnimationTimer: ActionTimer

    get actionAnimationTimer(): ActionTimer {
        return this._actionAnimationTimer
    }

    private _weaponIcon: WeaponIcon

    get weaponIcon(): WeaponIcon {
        return this._weaponIcon
    }

    private _actorTextWindow: ActorTextWindow

    get actorTextWindow(): ActorTextWindow {
        return this._actorTextWindow
    }

    private _actorSprite: ActorSprite

    get actorSprite(): ActorSprite {
        return this._actorSprite
    }

    private _targetSprites: TargetSprite[]

    get targetSprites(): TargetSprite[] {
        return this._targetSprites
    }

    private _targetTextWindows: TargetTextWindow[]

    get targetTextWindows(): TargetTextWindow[] {
        return this._targetTextWindows
    }

    private _targetHitPointMeters: {
        [battleId: string]: HitPointMeter
    }

    get targetHitPointMeters(): {
        [battleId: string]: HitPointMeter
    } {
        return this._targetHitPointMeters
    }

    hasCompleted(state: GameEngineState): boolean {
        return this.sawResultAftermath === true
    }

    mouseEventHappened(
        gameEngineState: GameEngineState,
        mouseEvent: OrchestratorComponentMouseEvent
    ) {
        if (
            mouseEvent.eventType === OrchestratorComponentMouseEventType.CLICKED
        ) {
            this._userRequestedAnimationSkip = true
            if (this.startedShowingResults === false) {
                this.updateHitPointMeters(gameEngineState)
                this.startedShowingResults = true
            }
        }
    }

    start(state: GameEngineState) {
        // Required by inheritance
    }

    resetInternalState() {
        this._actionAnimationTimer = new ActionTimer()
        this._userRequestedAnimationSkip = false
        this.sawResultAftermath = false
        this.startedShowingResults = false
        this._actionAnimationTimer = new ActionTimer()
        this._targetHitPointMeters = {}
    }

    update(gameEngineState: GameEngineState, graphics: GraphicsBuffer): void {
        if (
            this.actionAnimationTimer.currentPhase ===
            ActionAnimationPhase.INITIALIZED
        ) {
            this.setupActionAnimation(gameEngineState)
            this.actionAnimationTimer.start()
        }

        const phaseToShow: ActionAnimationPhase = this
            ._userRequestedAnimationSkip
            ? ActionAnimationPhase.FINISHED_SHOWING_RESULTS
            : this.actionAnimationTimer.currentPhase

        switch (phaseToShow) {
            case ActionAnimationPhase.INITIALIZED:
            case ActionAnimationPhase.BEFORE_ACTION:
            case ActionAnimationPhase.DURING_ACTION:
                this.drawActionAnimation(gameEngineState, graphics)
                break
            case ActionAnimationPhase.SHOWING_RESULTS:
            case ActionAnimationPhase.TARGET_REACTS:
                if (this.startedShowingResults === false) {
                    this.updateHitPointMeters(gameEngineState)
                    this.startedShowingResults = true
                }
                this.drawActionAnimation(gameEngineState, graphics)
                break
            case ActionAnimationPhase.FINISHED_SHOWING_RESULTS:
                this.drawActionAnimation(gameEngineState, graphics)
                this.sawResultAftermath = true
                break
        }
    }

    reset(gameEngineState: GameEngineState) {
        this.resetInternalState()
        BattleActionService.setAnimationCompleted({
            battleAction: BattleActionRecorderService.peekAtAnimationQueue(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder
            ),
            animationCompleted: true,
        })
    }

    private setupActionAnimation(gameEngineState: GameEngineState) {
        this._actorTextWindow = new ActorTextWindow()
        this._weaponIcon = new WeaponIcon()
        this._actorSprite = new ActorSprite()

        const actionToShow: BattleAction =
            BattleActionRecorderService.peekAtAnimationQueue(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder
            )

        const { battleSquaddie: actorBattle, squaddieTemplate: actorTemplate } =
            getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    gameEngineState.repository,
                    actionToShow.actor.actorBattleSquaddieId
                )
            )

        if (actionToShow?.action.actionTemplateId === undefined) {
            return
        }

        const actionTemplate = ObjectRepositoryService.getActionTemplateById(
            gameEngineState.repository,
            actionToShow.action.actionTemplateId
        )
        const results = SquaddieSquaddieResultsService.new({
            actingBattleSquaddieId: actionToShow.actor.actorBattleSquaddieId,
            actionContext: actionToShow.actor.actorContext,
            targetedBattleSquaddieIds: actionToShow.effect.squaddie.map(
                (s) => s.battleSquaddieId
            ),
            squaddieChanges: actionToShow.effect.squaddie,
        })

        this.actorTextWindow.start({
            actorTemplate: actorTemplate,
            actorBattle: actorBattle,
            actionTemplateName: actionTemplate.name,
            results,
        })

        this.actorSprite.start({
            actorBattleSquaddieId: actorBattle.battleSquaddieId,
            squaddieRepository: gameEngineState.repository,
            resourceHandler: gameEngineState.resourceHandler,
            startingPosition:
                (2 * ScreenDimensions.SCREEN_WIDTH) / 12 +
                WINDOW_SPACING.SPACING1,
            squaddieChanges: results.squaddieChanges[0],
        })
        this.weaponIcon.start()

        const resultPerTarget = actionToShow.effect.squaddie
        this.setupAnimationForTargetTextWindows(
            gameEngineState,
            resultPerTarget
        )
        this.setupAnimationForTargetSprites(
            gameEngineState,
            actionTemplate
                .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
            resultPerTarget
        )
        this.setupAnimationForTargetHitPointMeters(gameEngineState)
    }

    private setupAnimationForTargetSprites(
        gameEngineState: GameEngineState,
        actionEffectSquaddieTemplate: ActionEffectSquaddieTemplate,
        resultPerTarget: BattleActionSquaddieChange[]
    ) {
        const actionToShow: BattleAction =
            BattleActionRecorderService.peekAtAnimationQueue(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder
            )

        this._targetSprites = actionToShow.effect.squaddie
            .map((s) => s.battleSquaddieId)
            .map((battleId: string, index: number) => {
                const targetSprite = new TargetSprite()
                targetSprite.start({
                    targetBattleSquaddieId: battleId,
                    squaddieRepository: gameEngineState.repository,
                    actionEffectSquaddieTemplate,
                    result: resultPerTarget.find(
                        (change) => change.battleSquaddieId === battleId
                    ),
                    resourceHandler: gameEngineState.resourceHandler,
                    startingPosition: RectAreaService.right(
                        this.targetTextWindows[index].targetLabel.rectangle.area
                    ),
                })
                return targetSprite
            })
    }

    private setupAnimationForTargetTextWindows(
        gameEngineState: GameEngineState,
        resultPerTarget: BattleActionSquaddieChange[]
    ) {
        const actionToShow: BattleAction =
            BattleActionRecorderService.peekAtAnimationQueue(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder
            )

        if (actionToShow?.action.actionTemplateId === undefined) {
            this._targetTextWindows = []
            return
        }

        const actionTemplate = ObjectRepositoryService.getActionTemplateById(
            gameEngineState.repository,
            actionToShow.action.actionTemplateId
        )

        this._targetTextWindows = resultPerTarget
            .map((r) => r.battleSquaddieId)
            .map((battleId: string) => {
                const {
                    battleSquaddie: targetBattle,
                    squaddieTemplate: targetTemplate,
                } = getResultOrThrowError(
                    ObjectRepositoryService.getSquaddieByBattleId(
                        gameEngineState.repository,
                        battleId
                    )
                )

                const actionEffectSquaddieTemplate = actionTemplate
                    .actionEffectTemplates[0] as ActionEffectSquaddieTemplate

                const targetTextWindow = new TargetTextWindow()
                targetTextWindow.start({
                    targetTemplate: targetTemplate,
                    targetBattle: targetBattle,
                    result: resultPerTarget.find(
                        (change) => change.battleSquaddieId === battleId
                    ),
                    actionEffectSquaddieTemplate,
                })
                return targetTextWindow
            })
            .filter((x) => x)
    }

    private setupAnimationForTargetHitPointMeters(
        gameEngineState: GameEngineState
    ) {
        const actionToShow: BattleAction =
            BattleActionRecorderService.peekAtAnimationQueue(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder
            )

        if (actionToShow?.action.actionTemplateId === undefined) {
            this._targetTextWindows = []
            return
        }

        actionToShow.effect.squaddie.forEach(
            (change: BattleActionSquaddieChange, index: number) => {
                const battleSquaddieId = change.battleSquaddieId
                const {
                    battleSquaddie: targetBattle,
                    squaddieTemplate: targetTemplate,
                } = getResultOrThrowError(
                    ObjectRepositoryService.getSquaddieByBattleId(
                        gameEngineState.repository,
                        battleSquaddieId
                    )
                )

                let {
                    currentHitPoints: displayedHitPointsBeforeChange,
                    maxHitPoints,
                } = GetHitPoints({
                    battleSquaddie: targetBattle,
                    squaddieTemplate: targetTemplate,
                })

                displayedHitPointsBeforeChange -= change.healingReceived
                displayedHitPointsBeforeChange += change.damage.net

                this._targetHitPointMeters[battleSquaddieId] =
                    new HitPointMeter({
                        currentHitPoints: displayedHitPointsBeforeChange,
                        maxHitPoints,
                        left:
                            this._targetTextWindows[index].targetLabel.rectangle
                                .area.left + WINDOW_SPACING.SPACING1,
                        top:
                            this._targetTextWindows[index].targetLabel.rectangle
                                .area.top + 100,
                        hue: HUE_BY_SQUADDIE_AFFILIATION[
                            targetTemplate.squaddieId.affiliation
                        ],
                    })
            }
        )
    }

    private drawActionAnimation(
        gameEngineState: GameEngineState,
        graphicsContext: GraphicsBuffer
    ) {
        this.actorTextWindow.draw(graphicsContext, this.actionAnimationTimer)

        const actionToShow: BattleAction =
            BattleActionRecorderService.peekAtAnimationQueue(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder
            )

        if (actionToShow?.action.actionTemplateId === undefined) {
            return
        }

        const actionTemplate = ObjectRepositoryService.getActionTemplateById(
            gameEngineState.repository,
            actionToShow.action.actionTemplateId
        )

        const actionEffectSquaddieTemplate = actionTemplate
            .actionEffectTemplates[0] as ActionEffectSquaddieTemplate

        this.actorSprite.draw({
            timer: this.actionAnimationTimer,
            graphicsContext,
            actionEffectSquaddieTemplate,
        })
        this.weaponIcon.draw({
            graphicsContext,
            actorImageArea: this.actorSprite.getSquaddieImageBasedOnTimer(
                this.actionAnimationTimer,
                graphicsContext,
                actionEffectSquaddieTemplate
            ).area,
            actionEffectSquaddieTemplate,
        })
        this.targetTextWindows.forEach((t) =>
            t.draw(graphicsContext, this.actionAnimationTimer)
        )

        this.targetSprites.forEach((t) => {
            t.draw(
                this.actionAnimationTimer,
                graphicsContext,
                actionEffectSquaddieTemplate,
                actionToShow.effect.squaddie.find(
                    (change) => change.battleSquaddieId === t.battleSquaddieId
                )
            )
        })
        Object.values(this.targetHitPointMeters).forEach((t) =>
            t.draw(graphicsContext)
        )
    }

    private updateHitPointMeters(gameEngineState: GameEngineState) {
        const actionToShow: BattleAction =
            BattleActionRecorderService.peekAtAnimationQueue(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder
            )

        actionToShow.effect.squaddie.forEach((change) => {
            const battleSquaddieId = change.battleSquaddieId
            const hitPointMeter = this.targetHitPointMeters[battleSquaddieId]
            const hitPointChange: number =
                change.healingReceived - change.damage.net
            hitPointMeter.changeHitPoints(hitPointChange)
        })
    }
}
