import { describe, it, expect } from "vitest"
import { Blackboard, BlackboardService } from "./blackboard"

describe("Blackboard", () => {
    it("Can store and retrieve data based on a key", () => {
        const blackboard: Blackboard = BlackboardService.new()
        BlackboardService.add<number>(blackboard, "testKey", 9001)
        expect(BlackboardService.get<number>(blackboard, "testKey")).toEqual(
            9001
        )
    })
})
