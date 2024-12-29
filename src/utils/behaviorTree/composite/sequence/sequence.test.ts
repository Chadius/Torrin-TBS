import { beforeEach, describe, expect, it } from "vitest"
import { BehaviorTreeTask } from "../../task"
import { AlwaysTrueCondition } from "../../condition/alwaysTrue"
import { Blackboard, BlackboardService } from "../../../blackboard/blackboard"
import { AlwaysFalseCondition } from "../../condition/alwaysFalse"
import { SequenceComposite } from "./sequence"
import { IncrementBlackboard } from "../../testUtil/testIncrementBlackboard"

describe("Sequence composite", () => {
    let blackboard: Blackboard
    beforeEach(() => {
        blackboard = BlackboardService.new()
    })

    it("returns false if no children return true", () => {
        const sequence = new SequenceComposite(blackboard, [
            new AlwaysFalseCondition(blackboard),
            new AlwaysFalseCondition(blackboard),
            new AlwaysFalseCondition(blackboard),
        ])
        expect(sequence.run()).toBe(false)
    })

    it("returns false if one child returns false", () => {
        const sequence = new SequenceComposite(blackboard, [
            new AlwaysTrueCondition(blackboard),
            new AlwaysTrueCondition(blackboard),
            new AlwaysFalseCondition(blackboard),
        ])
        expect(sequence.run()).toBe(false)
    })

    it("returns as soon as one child returns false", () => {
        const sequence = new SequenceComposite(blackboard, [
            new IncrementBlackboard(blackboard),
            new IncrementBlackboard(blackboard),
            new IncrementBlackboard(blackboard),
            new AlwaysFalseCondition(blackboard),
            new IncrementBlackboard(blackboard),
        ])
        expect(sequence.run()).toBe(false)
        expect(BlackboardService.get(blackboard, "increment")).toEqual(3)
    })

    it("can clone recursively", () => {
        const children: BehaviorTreeTask[] = [
            new SequenceComposite(blackboard, [
                new AlwaysFalseCondition(blackboard),
            ]),
        ]

        const original = new SequenceComposite(blackboard, children)
        const clone: SequenceComposite = original.clone()

        expect(clone.children[0].children[0]).toEqual(
            original.children[0].children[0]
        )
        expect(clone.children[0].children[0]).not.toBe(
            original.children[0].children[0]
        )
    })
})
