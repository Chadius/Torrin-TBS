import { describe, expect, it } from "vitest"
import { BattleUISettings, BattleUISettingsService } from "./uiSettings"

describe("UI Settings", () => {
    it("can override UI Control Setting values with another UI Control Settings", () => {
        const settings1: BattleUISettings = BattleUISettingsService.new({
            letMouseScrollCamera: false,
        })

        const settings2: BattleUISettings = BattleUISettingsService.new({
            letMouseScrollCamera: true,
            pauseTimer: false,
        })

        const settings3 = BattleUISettingsService.combine(settings1, settings2)

        expect(settings3.letMouseScrollCamera).toBe(true)
        expect(settings3.displayBattleMap).toBeUndefined()
        expect(settings3.pauseTimer).toBe(false)
    })

    it("can ignore undefined Setting values when overriding", () => {
        const settings1: BattleUISettings = BattleUISettingsService.new({
            letMouseScrollCamera: false,
            displayBattleMap: true,
            displayPlayerHUD: false,
        })

        const settings2: BattleUISettings = BattleUISettingsService.new({
            displayBattleMap: false,
            displayPlayerHUD: true,
        })

        const settings3 = BattleUISettingsService.combine(settings1, settings2)

        expect(settings3.letMouseScrollCamera).toBe(false)
        expect(settings3.displayBattleMap).toBe(false)
        expect(settings3.displayPlayerHUD).toBe(true)
    })
})
