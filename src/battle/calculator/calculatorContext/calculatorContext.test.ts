import { describe, expect, it } from "vitest"
import { CalculatorContextService } from "./calculatorContext"
import { ObjectRepositoryService } from "../../objectRepository"
import { ChallengeModifierSettingService } from "../../challengeModifier/challengeModifierSetting"

describe("CalculatorContext", () => {
    it("will use given fields when making a new CalculatorContext", () => {
        const objectRepository = ObjectRepositoryService.new()
        const challengeModifierSetting = ChallengeModifierSettingService.new()
        const context = CalculatorContextService.new({
            actorBattleSquaddieId: "actorBattleSquaddieId",
            objectRepository: objectRepository,
            challengeModifierSetting: challengeModifierSetting,
        })

        expect(context.actorBattleSquaddieId).toEqual("actorBattleSquaddieId")
        expect(context.objectRepository).toBe(objectRepository)
        expect(context.challengeModifierSetting).toBe(challengeModifierSetting)
    })

    describe("will try to sanitize upon creation", () => {
        it("will throw an error if a battle squaddie id is included without an ObjectRepository", () => {
            const shouldThrowError = () => {
                // @ts-ignore This test intentionally leaves out required fields
                CalculatorContextService.new({
                    actorBattleSquaddieId: "actorBattleSquaddieId",
                })
            }

            expect(shouldThrowError).toThrow("objectRepository")
        })
    })
})
