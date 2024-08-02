import { BattleHUDState, BattleHUDStateService } from "./battleHUDState"
import { SummaryHUDStateService } from "./summaryHUD"

describe("BattleHUDState", () => {
    it("can be initialized with default fields", () => {
        const battleHUDState: BattleHUDState = BattleHUDStateService.new({})
        expect(battleHUDState.summaryHUDState).toBeUndefined()
    })
    it("can be initialized with given fields", () => {
        const battleHUDState: BattleHUDState = BattleHUDStateService.new({
            summaryHUDState: SummaryHUDStateService.new({
                mouseSelectionLocation: { x: 0, y: 1 },
            }),
        })
        expect(battleHUDState.summaryHUDState.mouseSelectionLocation).toEqual({
            x: 0,
            y: 1,
        })
    })
    it("can be cloned", () => {
        const battleHUDState: BattleHUDState = BattleHUDStateService.new({
            summaryHUDState: SummaryHUDStateService.new({
                mouseSelectionLocation: { x: 0, y: 1 },
            }),
        })

        const clone = BattleHUDStateService.clone(battleHUDState)

        expect(clone).toEqual(battleHUDState)
    })
})
