import {
    ACTION_ANIMATION_ATTACK_TIME,
    ACTION_ANIMATION_DELAY_TIME,
    ACTION_ANIMATION_FINISH_TIME,
    ActionAnimationPhase,
    TimeElapsedSinceAnimationStarted
} from "./actionAnimationConstants";

export class ActionTimer {
    constructor() {
        this.reset();
    }

    get currentPhase(): ActionAnimationPhase {
        if (this.startTime === undefined) {
            return ActionAnimationPhase.INITIALIZED;
        }

        const timeElapsed = TimeElapsedSinceAnimationStarted(this.startTime);

        if (timeElapsed < ACTION_ANIMATION_DELAY_TIME) {
            return ActionAnimationPhase.BEFORE_ACTION;
        }

        if (timeElapsed < ACTION_ANIMATION_ATTACK_TIME + ACTION_ANIMATION_DELAY_TIME) {
            return ActionAnimationPhase.DURING_ACTION;
        }

        if (timeElapsed < ACTION_ANIMATION_FINISH_TIME + ACTION_ANIMATION_ATTACK_TIME + ACTION_ANIMATION_DELAY_TIME) {
            return ActionAnimationPhase.AFTER_ACTION;
        }

        return ActionAnimationPhase.FINISHED_SHOWING_RESULTS;
    }

    private _startTime: number;

    get startTime(): number {
        return this._startTime;
    }

    hasBeenStarted(): boolean {
        return this.currentPhase !== ActionAnimationPhase.INITIALIZED;
    }

    reset() {
        this._startTime = undefined;
    }

    start() {
        this.reset();
        this._startTime = Date.now();
    }
}
