import { ActionDecisionType } from "./actionTemplate"
import { ActionEffectEndTurnTemplateService } from "./actionEffectEndTurnTemplate"

describe("Action Effect End Template", () => {
    describe("actor decisions", () => {
        it("defaults to no decisions needed", () => {
            const template = ActionEffectEndTurnTemplateService.new({})
            expect(template.actionDecisions).toEqual([])
        })
        it("can specify other types of decisions", () => {
            const template = ActionEffectEndTurnTemplateService.new({
                actionDecisions: [ActionDecisionType.ACTION_SELECTION],
            })
            expect(template.actionDecisions).toEqual([
                ActionDecisionType.ACTION_SELECTION,
            ])
        })
    })
})
