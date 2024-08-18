import { ActionDecisionType } from "./actionTemplate"
import { ActionEffectMovementTemplateService } from "./actionEffectMovementTemplate"

describe("Action Effect Movement Template", () => {
    describe("actor decisions", () => {
        it("defaults to choosing a map location", () => {
            const template = ActionEffectMovementTemplateService.new({})
            expect(template.actionDecisions).toEqual([
                ActionDecisionType.LOCATION_SELECTION,
            ])
        })
        it("can specify other types of decisions", () => {
            const template = ActionEffectMovementTemplateService.new({
                actionDecisions: [ActionDecisionType.ACTION_SELECTION],
            })
            expect(template.actionDecisions).toEqual([
                ActionDecisionType.ACTION_SELECTION,
            ])
        })
    })
})
