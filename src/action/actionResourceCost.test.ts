import { ActionResourceCostService } from "./actionResourceCost"
import { describe, expect, it } from "vitest"

describe("Action Resource Cost", () => {
    it("will use reasonable defaults", () => {
        const cost = ActionResourceCostService.new({})

        expect(cost.actionPoints).toEqual(1)
        expect(cost.numberOfTimesPerRound).toBeUndefined()
        expect(cost.cooldownTurns).toBeUndefined()
    })

    it("will not allow negative action point costs", () => {
        const cost = ActionResourceCostService.new({
            actionPoints: -9001,
        })

        expect(cost.actionPoints).toEqual(0)
    })

    it("will not allow negative per round usage", () => {
        const cost = ActionResourceCostService.new({
            numberOfTimesPerRound: -9001,
        })

        expect(cost.numberOfTimesPerRound).toEqual(1)
    })
})
