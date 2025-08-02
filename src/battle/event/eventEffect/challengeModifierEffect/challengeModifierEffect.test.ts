import { describe, expect, it } from "vitest"
import { ChallengeModifierEffectService } from "./challengeModifierEffect"

describe("ChallengeModifierEffect", () => {
    describe("Sanitize", () => {
        it("throws an error if type is missing", () => {
            const shouldThrowError = () => {
                // @ts-ignore Test is intentionally throwing an error due to missing fields
                ChallengeModifierEffectService.sanitize({})
            }

            expect(() => {
                shouldThrowError()
            }).toThrow("challengeModifierType")
        })
    })
})
