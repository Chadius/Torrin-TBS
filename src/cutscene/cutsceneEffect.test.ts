import { describe, expect, it } from "vitest"
import { CutsceneEffectService } from "./cutsceneEffect"

describe("CutsceneEffect", () => {
    describe("Sanitize", () => {
        it("throws an error if cutsceneId is missing", () => {
            const shouldThrowError = () => {
                // @ts-ignore Test is intentionally throwing an error due to missing fields
                CutsceneEffectService.sanitize({})
            }

            expect(() => {
                shouldThrowError()
            }).toThrow("cutsceneId")
        })
    })
})
