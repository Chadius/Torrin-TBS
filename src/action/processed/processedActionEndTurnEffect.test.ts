import {
    BattleActionDecisionStep,
    BattleActionDecisionStepService,
} from "../../battle/actionDecision/battleActionDecisionStep"
import {
    ProcessedActionEndTurnEffect,
    ProcessedActionEndTurnEffectService,
} from "./processedActionEndTurnEffect"
import { DecidedActionEndTurnEffectService } from "../decided/decidedActionEndTurnEffect"
import { ActionEffectEndTurnTemplateService } from "../template/actionEffectEndTurnTemplate"

it("converts from BattleActionDecisionStep", () => {
    const endTurnStep: BattleActionDecisionStep =
        BattleActionDecisionStepService.new()
    BattleActionDecisionStepService.setActor({
        actionDecisionStep: endTurnStep,
        battleSquaddieId: "battleSquaddieId",
    })
    BattleActionDecisionStepService.addAction({
        actionDecisionStep: endTurnStep,
        endTurn: true,
    })

    const actualEffect: ProcessedActionEndTurnEffect =
        ProcessedActionEndTurnEffectService.new({
            battleActionDecisionStep: endTurnStep,
        })

    const expectedEffect: ProcessedActionEndTurnEffect =
        ProcessedActionEndTurnEffectService.newFromDecidedActionEffect({
            decidedActionEffect: DecidedActionEndTurnEffectService.new({
                template: ActionEffectEndTurnTemplateService.new({}),
            }),
        })
    expect(actualEffect).toEqual(expectedEffect)
})
