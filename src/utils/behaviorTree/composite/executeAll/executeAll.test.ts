import { beforeEach, describe, expect, it } from "vitest"
import { BehaviorTreeTask } from "../../task"
import { Blackboard, BlackboardService } from "../../../blackboard/blackboard"
import { AlwaysFalseCondition } from "../../condition/alwaysFalse"
import { IncrementBlackboard } from "../../testUtil/testIncrementBlackboard"
import { ExecuteAllComposite } from "./executeAll"

describe("Execute All composite", () => {
    let blackboard: Blackboard
    beforeEach(() => {
        blackboard = BlackboardService.new()
    })

    it("always returns true", () => {
        const sequence = new ExecuteAllComposite(blackboard, [
            new AlwaysFalseCondition(blackboard),
            new AlwaysFalseCondition(blackboard),
            new AlwaysFalseCondition(blackboard),
        ])
        expect(sequence.run()).toBe(true)
    })

    it("executes all children", () => {
        const sequence = new ExecuteAllComposite(blackboard, [
            new IncrementBlackboard(blackboard),
            new IncrementBlackboard(blackboard),
            new IncrementBlackboard(blackboard),
        ])
        sequence.run()
        expect(BlackboardService.get<number>(blackboard, "increment")).toEqual(
            3
        )
    })

    it("can clone recursively", () => {
        const children: BehaviorTreeTask[] = [
            new ExecuteAllComposite(blackboard, [
                new AlwaysFalseCondition(blackboard),
            ]),
        ]

        const original = new ExecuteAllComposite(blackboard, children)
        const clone: ExecuteAllComposite = original.clone()

        expect(clone.children[0].children[0]).toEqual(
            original.children[0].children[0]
        )
        expect(clone.children[0].children[0]).not.toBe(
            original.children[0].children[0]
        )
    })
})
