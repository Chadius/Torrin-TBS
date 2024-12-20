import { UIControlSettings } from "./uiControlSettings"
import { describe, expect, it } from "vitest"

describe("UI Control Settings", () => {
    it("can override UI Control Setting values with another UI Control Settings", () => {
        const settings1: UIControlSettings = new UIControlSettings({
            scrollCamera: false,
        })

        const settings2: UIControlSettings = new UIControlSettings({
            scrollCamera: true,
            pauseTimer: false,
        })

        settings1.update(settings2)

        expect(settings1.letMouseScrollCamera).toBe(true)
        expect(settings1.displayBattleMap).toBeUndefined()
        expect(settings1.pauseTimer).toBe(false)
    })

    it("can ignore undefined Setting values when overriding", () => {
        const settings1: UIControlSettings = new UIControlSettings({
            scrollCamera: false,
            displayMap: true,
        })

        const settings2: UIControlSettings = new UIControlSettings({
            displayMap: false,
        })

        settings1.update(settings2)

        expect(settings1.letMouseScrollCamera).toBe(false)
        expect(settings1.displayBattleMap).toBe(false)
    })
})
