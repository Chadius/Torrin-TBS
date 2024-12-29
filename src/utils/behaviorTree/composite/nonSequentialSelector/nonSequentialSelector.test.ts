import { beforeEach, describe, expect, it, vi } from "vitest"
import { BehaviorTreeTask } from "../../task"
import { AlwaysTrueCondition } from "../../condition/alwaysTrue"
import { Blackboard, BlackboardService } from "../../../blackboard/blackboard"
import { AlwaysFalseCondition } from "../../condition/alwaysFalse"
import { NonSequentialSelectorComposite } from "./nonSequentialSelector"

describe("Non Sequential Selector composite", () => {
    let blackboard: Blackboard
    beforeEach(() => {
        blackboard = BlackboardService.new()
    })

    it("returns false if no children return true", () => {
        const sequence = new NonSequentialSelectorComposite(blackboard, [
            new AlwaysFalseCondition(blackboard),
            new AlwaysFalseCondition(blackboard),
            new AlwaysFalseCondition(blackboard),
        ])
        expect(sequence.run()).toBe(false)
    })

    it("returns true if one child returns true", () => {
        const sequence = new NonSequentialSelectorComposite(blackboard, [
            new AlwaysFalseCondition(blackboard),
            new AlwaysFalseCondition(blackboard),
            new AlwaysTrueCondition(blackboard),
        ])
        expect(sequence.run()).toBe(true)
    })

    it("returns as soon as one child returns true", () => {
        const trueTask: AlwaysTrueCondition = new AlwaysTrueCondition(
            blackboard
        )
        const trueTaskSpy = vi.spyOn(trueTask, "run")

        const sequence = new NonSequentialSelectorComposite(blackboard, [
            new AlwaysFalseCondition(blackboard),
            new AlwaysFalseCondition(blackboard),
            trueTask,
        ])
        expect(sequence.run()).toBe(true)
        expect(trueTaskSpy).toHaveBeenCalled()
    })

    it("can clone recursively", () => {
        const children: BehaviorTreeTask[] = [
            new NonSequentialSelectorComposite(blackboard, [
                new AlwaysFalseCondition(blackboard),
                new AlwaysTrueCondition(blackboard),
            ]),
        ]

        const original = new NonSequentialSelectorComposite(
            blackboard,
            children
        )
        const clone: NonSequentialSelectorComposite = original.clone()

        expect(clone.children).toEqual(original.children)
        expect(clone.children).not.toBe(original.children)
    })
})
