import { beforeEach, describe, expect, it } from "vitest"
import { BehaviorTreeTask } from "../../task"
import { AlwaysTrueCondition } from "../../condition/alwaysTrue"
import { DataBlob, DataBlobService } from "../../../dataBlob/dataBlob"
import { AlwaysFalseCondition } from "../../condition/alwaysFalse"
import { SelectorComposite } from "./selector"
import { IncrementBlackboard } from "../../testUtil/testIncrementBlackboard"

describe("Selector composite", () => {
    let blackboard: DataBlob
    beforeEach(() => {
        blackboard = DataBlobService.new()
    })

    it("returns false if no children return true", () => {
        const sequence = new SelectorComposite(blackboard, [
            new AlwaysFalseCondition(blackboard),
            new AlwaysFalseCondition(blackboard),
            new AlwaysFalseCondition(blackboard),
        ])
        expect(sequence.run()).toBe(false)
    })

    it("returns true if one child returns true", () => {
        const sequence = new SelectorComposite(blackboard, [
            new AlwaysFalseCondition(blackboard),
            new AlwaysFalseCondition(blackboard),
            new AlwaysTrueCondition(blackboard),
        ])
        expect(sequence.run()).toBe(true)
    })

    it("returns as soon as one child returns true", () => {
        const sequence = new SelectorComposite(blackboard, [
            new AlwaysFalseCondition(blackboard),
            new AlwaysFalseCondition(blackboard),
            new IncrementBlackboard(blackboard),
            new IncrementBlackboard(blackboard),
            new IncrementBlackboard(blackboard),
            new IncrementBlackboard(blackboard),
        ])
        expect(sequence.run()).toBe(true)
        expect(DataBlobService.get(blackboard, "increment")).toEqual(1)
    })

    it("can clone recursively", () => {
        const children: BehaviorTreeTask[] = [
            new SelectorComposite(blackboard, [
                new AlwaysFalseCondition(blackboard),
            ]),
        ]

        const original = new SelectorComposite(blackboard, children)
        const clone: SelectorComposite = original.clone()

        expect(clone.children[0].children[0]).toEqual(
            original.children[0].children[0]
        )
        expect(clone.children[0].children[0]).not.toBe(
            original.children[0].children[0]
        )
    })
})
