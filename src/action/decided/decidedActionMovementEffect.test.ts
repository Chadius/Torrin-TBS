import { DecidedActionMovementEffectService } from "./decidedActionMovementEffect"
import { ActionEffectMovementTemplateService } from "../template/actionEffectMovementTemplate"

describe("DecidedActionMovementEffect", () => {
    describe("areDecisionsRequired", () => {
        it("they are not required if a destination is already set", () => {
            const effect = DecidedActionMovementEffectService.new({
                template: ActionEffectMovementTemplateService.new({}),
                destination: { q: 0, r: 0 },
            })

            expect(
                DecidedActionMovementEffectService.areDecisionsRequired(effect)
            ).toBeFalsy()
        })
        it("they are required if a target is not set", () => {
            const effect = DecidedActionMovementEffectService.new({
                template: ActionEffectMovementTemplateService.new({}),
            })

            expect(
                DecidedActionMovementEffectService.areDecisionsRequired(effect)
            ).toBeTruthy()
        })
    })
})
