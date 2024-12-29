import { beforeEach, describe, expect, it } from "vitest"
import { Blackboard, BlackboardService } from "../../blackboard/blackboard"
import { AlwaysTrueCondition } from "./alwaysTrue"

describe("Always True condition", () => {
    let blackboard: Blackboard
    beforeEach(() => {
        blackboard = BlackboardService.new()
    })

    it("returns true when run", () => {
        const condition = new AlwaysTrueCondition(blackboard)
        expect(condition.run()).toBe(true)
    })

    it("can be cloned", () => {
        const original = new AlwaysTrueCondition(blackboard)
        const clone = original.clone()
        expect(clone.blackboard).toEqual(original.blackboard)
        expect(clone.run()).toBe(true)
    })
})
