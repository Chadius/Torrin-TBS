import {
    OrchestratorComponentKeyEvent,
    OrchestratorComponentKeyEventType,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType,
} from "../../orchestrator/battleOrchestratorComponent"
import { SquaddieActionAnimator } from "../squaddieActionAnimator"
import { ObjectRepository } from "../../objectRepository"
import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"
import { BattleActionService } from "../../history/battleAction/battleAction"
import { BattleActionRecorderService } from "../../history/battleAction/battleActionRecorder"
import { GameEngineState } from "../../../gameEngine/gameEngineState/gameEngineState"
import { SquaddieActionAnimationDrawStateService } from "../actionAnimation/animationPlanner/squaddieActionAnimationDrawState/squaddieActionAnimationDrawState"
import { SquaddieActionAnimationPlanService } from "../actionAnimation/animationPlanner/squaddieActionAnimationPlanService"
import {
    SquaddieActOnSquaddieUIObjects,
    SquaddieActOnSquaddieUIObjectsService,
} from "./uiObjects"
import { ResourceRepository } from "../../../resource/resourceRepository.ts"

export class SquaddieTargetsOtherSquaddiesAnimator
    implements SquaddieActionAnimator
{
    sawResultAftermath: boolean
    startedShowingResults: boolean
    userRequestedAnimationSkip: boolean

    uiObjects: SquaddieActOnSquaddieUIObjects | undefined

    constructor() {
        this.uiObjects = undefined
        this.startedShowingResults = false
        this.sawResultAftermath = false
        this.userRequestedAnimationSkip = false
        this.resetInternalState()
    }

    hasCompleted(_: GameEngineState): boolean {
        return this.sawResultAftermath
    }

    mouseEventHappened(
        _: GameEngineState,
        mouseEvent: OrchestratorComponentMouseEvent
    ) {
        if (
            mouseEvent.eventType === OrchestratorComponentMouseEventType.RELEASE
        ) {
            this.userRequestedAnimationSkip = true
            if (!this.startedShowingResults) {
                SquaddieActOnSquaddieUIObjectsService.updateHitPointMeters(
                    this.uiObjects
                )
                this.startedShowingResults = true
            }
        }
    }

    keyEventHappened(
        _: GameEngineState,
        event: OrchestratorComponentKeyEvent
    ): void {
        if (event.eventType === OrchestratorComponentKeyEventType.PRESSED) {
            this.userRequestedAnimationSkip = true
            if (!this.startedShowingResults) {
                SquaddieActOnSquaddieUIObjectsService.updateHitPointMeters(
                    this.uiObjects
                )
                this.startedShowingResults = true
            }
        }
    }

    start(_: GameEngineState) {
        // Required by inheritance
    }

    resetInternalState() {
        this.userRequestedAnimationSkip = false
        this.sawResultAftermath = false
        this.startedShowingResults = false
        this.uiObjects = undefined
    }

    update({
        gameEngineState,
        graphicsContext,
        resourceRepository,
    }: {
        gameEngineState: GameEngineState
        graphicsContext: GraphicsBuffer
        resourceRepository: ResourceRepository
    }): void {
        this.initializeDrawing({
            gameEngineState,
            resourceRepository,
            repository: gameEngineState.repository!,
            graphicsContext,
        })

        const timeAnimationStarted =
            SquaddieActOnSquaddieUIObjectsService.getTimeAnimationStarted(
                this.uiObjects
            )
        const timeToShowResults =
            SquaddieActOnSquaddieUIObjectsService.getTimeToShowResults(
                this.uiObjects
            )

        const timeElapsed =
            timeAnimationStarted != undefined && timeToShowResults != undefined
                ? Date.now() - timeAnimationStarted
                : undefined

        this.animateSquaddies({
            graphicsContext,
            timeElapsed,
        })

        if (
            !this.startedShowingResults &&
            timeElapsed != undefined &&
            timeToShowResults != undefined &&
            timeElapsed >= timeToShowResults
        ) {
            SquaddieActOnSquaddieUIObjectsService.updateHitPointMeters(
                this.uiObjects
            )
            this.startedShowingResults = true
        }

        if (this.uiObjects != undefined) {
            SquaddieActOnSquaddieUIObjectsService.draw({
                uiObjects: this.uiObjects,
                graphicsContext,
                startedShowingResults: this.startedShowingResults,
            })
        }
    }

    private animateSquaddies({
        graphicsContext,
        timeElapsed,
    }: {
        graphicsContext: GraphicsBuffer
        timeElapsed: number | undefined
    }) {
        if (this.userRequestedAnimationSkip) {
            this.sawResultAftermath = true
            return
        }

        if (this.uiObjects?.squaddieActionAnimationDrawState == undefined)
            return
        SquaddieActionAnimationDrawStateService.draw({
            drawState: this.uiObjects?.squaddieActionAnimationDrawState,
            graphicsContext,
        })

        if (
            this.uiObjects?.squaddieActionAnimationDrawState.animationPlan ==
            undefined
        )
            return

        const timeTotalForAnimation =
            SquaddieActionAnimationPlanService.getTotalAnimationTime({
                animationPlan:
                    this.uiObjects?.squaddieActionAnimationDrawState
                        .animationPlan,
            }) ?? 1000

        if (timeElapsed != undefined && timeElapsed >= timeTotalForAnimation) {
            this.sawResultAftermath = true
        }
    }

    reset(gameEngineState: GameEngineState) {
        this.resetInternalState()
        const battleAction = BattleActionRecorderService.peekAtAnimationQueue(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder
        )
        if (battleAction == undefined) return
        BattleActionService.setAnimationCompleted({
            battleAction: battleAction,
            animationCompleted: true,
        })
    }

    private initializeDrawing({
        gameEngineState,
        resourceRepository,
        repository,
        graphicsContext,
    }: {
        gameEngineState: GameEngineState
        resourceRepository: ResourceRepository
        repository: ObjectRepository
        graphicsContext: GraphicsBuffer
    }) {
        if (this.uiObjects?.squaddieActionAnimationDrawState != undefined) {
            return
        }

        const actionToShow = BattleActionRecorderService.peekAtAnimationQueue(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder
        )
        if (actionToShow == undefined) return

        this.uiObjects = SquaddieActOnSquaddieUIObjectsService.new({
            actionToShow,
            actionTemplateId: actionToShow.action?.actionTemplateId,
            resourceRepository,
            repository,
            results: {
                actorContext: actionToShow.actor.actorContext,
                squaddieChanges: actionToShow.effect.squaddie,
            },
            graphicsContext,
        })
        SquaddieActOnSquaddieUIObjectsService.initializeAnimation({
            uiObjects: this.uiObjects,
        })
    }
}
