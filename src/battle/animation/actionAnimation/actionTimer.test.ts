import {ActionTimer} from "./actionTimer";
import {
    ACTION_ANIMATION_ATTACK_TIME,
    ACTION_ANIMATION_DELAY_TIME,
    ACTION_ANIMATION_FINISH_TIME,
    ActionAnimationPhase
} from "./actionAnimationConstants";

describe('ActionTimer', () => {
    beforeEach(() => {
        jest.spyOn(Date, 'now').mockImplementation(() => 0);
    });

    it('knows it has not been started upon construction', () => {
        const timer = new ActionTimer();
        expect(timer.hasBeenStarted()).toBeFalsy();
        expect(timer.startTime).toBeUndefined();
        expect(timer.currentPhase).toBe(ActionAnimationPhase.INITIALIZED);
    });

    it('can be started in before action phase', () => {
        const timer = new ActionTimer();
        timer.start();
        expect(timer.hasBeenStarted()).toBeTruthy();
        expect(timer.startTime).toBe(0);
        expect(timer.currentPhase).toBe(ActionAnimationPhase.BEFORE_ACTION);
    });

    it('knows when it is during action', () => {
        const timer = new ActionTimer();
        timer.start();
        jest.spyOn(Date, 'now').mockImplementation(() => ACTION_ANIMATION_DELAY_TIME + 1);
        expect(timer.currentPhase).toBe(ActionAnimationPhase.DURING_ACTION);
    });

    it('knows when action is finished', () => {
        const timer = new ActionTimer();
        timer.start();
        jest.spyOn(Date, 'now').mockImplementation(() => ACTION_ANIMATION_DELAY_TIME + ACTION_ANIMATION_ATTACK_TIME + 1);
        expect(timer.currentPhase).toBe(ActionAnimationPhase.AFTER_ACTION);
    });

    it('knows when results are finished showing', () => {
        const timer = new ActionTimer();
        timer.start();
        jest.spyOn(Date, 'now').mockImplementation(() => ACTION_ANIMATION_FINISH_TIME + ACTION_ANIMATION_DELAY_TIME + ACTION_ANIMATION_ATTACK_TIME + 1);
        expect(timer.currentPhase).toBe(ActionAnimationPhase.FINISHED_SHOWING_RESULTS);
    });

    it('can be reset', () => {
        const timer = new ActionTimer();
        timer.start();
        timer.reset();
        expect(timer.hasBeenStarted()).toBeFalsy();
        expect(timer.startTime).toBeUndefined();
        expect(timer.currentPhase).toBe(ActionAnimationPhase.INITIALIZED);
    });
});
