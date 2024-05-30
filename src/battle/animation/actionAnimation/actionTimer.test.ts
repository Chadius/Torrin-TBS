import { ActionTimer } from "./actionTimer"
import {
    ACTION_ANIMATION_ACTION_TIME,
    ACTION_ANIMATION_BEFORE_ACTION_TIME,
    ACTION_ANIMATION_SHOW_RESULTS_TIME,
    ACTION_ANIMATION_TARGET_REACTS_TO_ACTION_TIME,
    ActionAnimationPhase,
} from "./actionAnimationConstants"

describe("ActionTimer", () => {
    beforeEach(() => {
        jest.spyOn(Date, "now").mockImplementation(() => 0)
    })

    it("knows it has not been started upon construction", () => {
        const timer = new ActionTimer()
        expect(timer.hasBeenStarted()).toBeFalsy()
        expect(timer.startTime).toBeUndefined()
        expect(timer.currentPhase).toBe(ActionAnimationPhase.INITIALIZED)
    })

    it("can be started in before action phase", () => {
        const timer = new ActionTimer()
        timer.start()
        expect(timer.hasBeenStarted()).toBeTruthy()
        expect(timer.startTime).toBe(0)
        expect(timer.currentPhase).toBe(ActionAnimationPhase.BEFORE_ACTION)
    })

    it("knows when it is during action", () => {
        const timer = new ActionTimer()
        timer.start()
        jest.spyOn(Date, "now").mockImplementation(
            () => ACTION_ANIMATION_BEFORE_ACTION_TIME + 1
        )
        expect(timer.currentPhase).toBe(ActionAnimationPhase.DURING_ACTION)
    })

    it("knows when target is reacting", () => {
        const timer = new ActionTimer()
        timer.start()
        jest.spyOn(Date, "now").mockImplementation(
            () =>
                ACTION_ANIMATION_BEFORE_ACTION_TIME +
                ACTION_ANIMATION_ACTION_TIME +
                1
        )
        expect(timer.currentPhase).toBe(ActionAnimationPhase.TARGET_REACTS)
    })

    it("knows when action is finished and showing results", () => {
        const timer = new ActionTimer()
        timer.start()
        jest.spyOn(Date, "now").mockImplementation(
            () =>
                ACTION_ANIMATION_BEFORE_ACTION_TIME +
                ACTION_ANIMATION_ACTION_TIME +
                ACTION_ANIMATION_TARGET_REACTS_TO_ACTION_TIME +
                1
        )
        expect(timer.currentPhase).toBe(ActionAnimationPhase.SHOWING_RESULTS)
    })

    it("knows when results are finished showing", () => {
        const timer = new ActionTimer()
        timer.start()
        jest.spyOn(Date, "now").mockImplementation(
            () =>
                ACTION_ANIMATION_SHOW_RESULTS_TIME +
                ACTION_ANIMATION_BEFORE_ACTION_TIME +
                ACTION_ANIMATION_ACTION_TIME +
                ACTION_ANIMATION_TARGET_REACTS_TO_ACTION_TIME +
                1
        )
        expect(timer.currentPhase).toBe(
            ActionAnimationPhase.FINISHED_SHOWING_RESULTS
        )
    })

    it("can be reset", () => {
        const timer = new ActionTimer()
        timer.start()
        timer.reset()
        expect(timer.hasBeenStarted()).toBeFalsy()
        expect(timer.startTime).toBeUndefined()
        expect(timer.currentPhase).toBe(ActionAnimationPhase.INITIALIZED)
    })
})
