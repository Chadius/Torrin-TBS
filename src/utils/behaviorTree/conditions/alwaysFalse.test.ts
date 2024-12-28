import { describe, it, expect, beforeEach } from "vitest"
import { Blackboard, BlackboardService } from "../../blackboard/blackboard"
import { AlwaysFalseCondition } from "./alwaysFalse"

describe("Always False condition", () => {
    let blackboard: Blackboard
    beforeEach(() => {
        blackboard = BlackboardService.new()
    })

    it("returns false when run", () => {
        const condition = new AlwaysFalseCondition(blackboard)
        expect(condition.run()).toBe(false)
    })

    it("can be cloned", () => {
        const original = new AlwaysFalseCondition(blackboard)
        const clone = original.clone()
        expect(clone.blackboard).toEqual(original.blackboard)
        expect(clone.run()).toBe(false)
    })
})
