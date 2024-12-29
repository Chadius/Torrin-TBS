import { beforeEach, describe, expect, it, vi } from "vitest"
import { BehaviorTreeTask } from "../../task"
import { AlwaysTrueCondition } from "../../condition/alwaysTrue"
import { Blackboard, BlackboardService } from "../../../blackboard/blackboard"
import { AlwaysFalseCondition } from "../../condition/alwaysFalse"
import { NonSequentialSequenceComposite } from "./nonSequentialSequence"

describe("Non Sequential Selector composite", () => {
    let blackboard: Blackboard
    beforeEach(() => {
        blackboard = BlackboardService.new()
    })

    it("returns false if no children return true", () => {
        const sequence = new NonSequentialSequenceComposite(blackboard, [
            new AlwaysFalseCondition(blackboard),
            new AlwaysFalseCondition(blackboard),
            new AlwaysFalseCondition(blackboard),
        ])
        expect(sequence.run()).toBe(false)
    })

    it("returns false if one child returns false", () => {
        const falseTask: AlwaysFalseCondition = new AlwaysFalseCondition(
            blackboard
        )
        const falseTaskSpy = vi.spyOn(falseTask, "run")

        const sequence = new NonSequentialSequenceComposite(blackboard, [
            new AlwaysTrueCondition(blackboard),
            new AlwaysTrueCondition(blackboard),
            falseTask,
        ])
        expect(sequence.run()).toBe(false)
        expect(falseTaskSpy).toHaveBeenCalled()
    })

    it("can clone recursively", () => {
        const children: BehaviorTreeTask[] = [
            new NonSequentialSequenceComposite(blackboard, [
                new AlwaysFalseCondition(blackboard),
                new AlwaysTrueCondition(blackboard),
            ]),
        ]

        const original = new NonSequentialSequenceComposite(
            blackboard,
            children
        )
        const clone: NonSequentialSequenceComposite = original.clone()
        expect(clone.children).toEqual(original.children)
        expect(clone.children).not.toBe(original.children)
    })
})
