import { BattleHUDState, BattleHUDStateService } from "./battleHUDState"
import { SummaryHUDStateService } from "./summaryHUD"
import { describe, expect, it } from "vitest"

describe("BattleHUDState", () => {
    it("can be initialized with default fields", () => {
        const battleHUDState: BattleHUDState = BattleHUDStateService.new({})
        expect(battleHUDState.summaryHUDState).toBeUndefined()
    })
    it("can be initialized with given fields", () => {
        const battleHUDState: BattleHUDState = BattleHUDStateService.new({
            summaryHUDState: SummaryHUDStateService.new({
                screenSelectionCoordinates: { x: 0, y: 1 },
            }),
        })
        expect(
            battleHUDState.summaryHUDState.screenSelectionCoordinates
        ).toEqual({
            x: 0,
            y: 1,
        })
    })
    it("can be cloned", () => {
        const battleHUDState: BattleHUDState = BattleHUDStateService.new({
            summaryHUDState: SummaryHUDStateService.new({
                screenSelectionCoordinates: { x: 0, y: 1 },
            }),
        })

        const clone = BattleHUDStateService.clone(battleHUDState)

        expect(clone).toEqual(battleHUDState)
    })
})
