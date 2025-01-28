import { BattleHUDState, BattleHUDStateService } from "./battleHUDState"
import { SummaryHUDStateService } from "../summary/summaryHUD"
import { describe, expect, it } from "vitest"

describe("BattleHUDState", () => {
    it("can be initialized with default fields", () => {
        const battleHUDState: BattleHUDState = BattleHUDStateService.new({})
        expect(battleHUDState.summaryHUDState).toBeUndefined()
    })
    it("can be cloned", () => {
        const battleHUDState: BattleHUDState = BattleHUDStateService.new({
            summaryHUDState: SummaryHUDStateService.new(),
        })

        const clone = BattleHUDStateService.clone(battleHUDState)

        expect(clone).toEqual(battleHUDState)
    })
})
