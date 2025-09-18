import {
    ACTION_ANIMATION_ACTION_TIME,
    ACTION_ANIMATION_BEFORE_ACTION_TIME,
    ACTION_ANIMATION_SHOW_RESULTS_TIME,
    ACTION_ANIMATION_TARGET_REACTS_TO_ACTION_TIME,
    ActionAnimationPhase,
    TActionAnimationPhase,
    TimeElapsedSinceAnimationStarted,
} from "./actionAnimationConstants"

export class ActionTimer {
    constructor() {
        this.reset()
    }

    get currentPhase(): TActionAnimationPhase {
        if (this.startTime === undefined) {
            return ActionAnimationPhase.INITIALIZED
        }

        const timeElapsed = TimeElapsedSinceAnimationStarted(this.startTime)

        if (timeElapsed < ACTION_ANIMATION_BEFORE_ACTION_TIME) {
            return ActionAnimationPhase.BEFORE_ACTION
        }

        if (
            timeElapsed <
            ACTION_ANIMATION_ACTION_TIME + ACTION_ANIMATION_BEFORE_ACTION_TIME
        ) {
            return ActionAnimationPhase.DURING_ACTION
        }

        if (
            timeElapsed <
            ACTION_ANIMATION_TARGET_REACTS_TO_ACTION_TIME +
                ACTION_ANIMATION_ACTION_TIME +
                ACTION_ANIMATION_BEFORE_ACTION_TIME
        ) {
            return ActionAnimationPhase.TARGET_REACTS
        }

        if (
            timeElapsed <
            ACTION_ANIMATION_SHOW_RESULTS_TIME +
                ACTION_ANIMATION_TARGET_REACTS_TO_ACTION_TIME +
                ACTION_ANIMATION_ACTION_TIME +
                ACTION_ANIMATION_BEFORE_ACTION_TIME
        ) {
            return ActionAnimationPhase.SHOWING_RESULTS
        }

        return ActionAnimationPhase.FINISHED_SHOWING_RESULTS
    }

    private _startTime: number | undefined

    get startTime(): number | undefined {
        return this._startTime
    }

    hasBeenStarted(): boolean {
        return this.currentPhase !== ActionAnimationPhase.INITIALIZED
    }

    reset() {
        this._startTime = undefined
    }

    start() {
        this.reset()
        this._startTime = Date.now()
    }
}
