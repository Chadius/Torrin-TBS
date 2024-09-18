import {
    BattleActionDecisionStep,
    BattleActionDecisionStepService,
} from "../../battle/actionDecision/battleActionDecisionStep"
import {
    ProcessedActionMovementEffect,
    ProcessedActionMovementEffectService,
} from "./processedActionMovementEffect"
import { DecidedActionMovementEffectService } from "../decided/decidedActionMovementEffect"
import { ActionEffectMovementTemplateService } from "../template/actionEffectMovementTemplate"

it("converts from BattleActionDecisionStep", () => {
    const movementStep: BattleActionDecisionStep =
        BattleActionDecisionStepService.new()
    BattleActionDecisionStepService.setActor({
        actionDecisionStep: movementStep,
        battleSquaddieId: "battleSquaddieId",
    })
    BattleActionDecisionStepService.addAction({
        actionDecisionStep: movementStep,
        movement: true,
    })
    BattleActionDecisionStepService.setConfirmedTarget({
        actionDecisionStep: movementStep,
        targetLocation: { q: 0, r: 1 },
    })

    const actualEffect: ProcessedActionMovementEffect =
        ProcessedActionMovementEffectService.new({
            battleActionDecisionStep: movementStep,
        })

    const expectedEffect: ProcessedActionMovementEffect =
        ProcessedActionMovementEffectService.newFromDecidedActionEffect({
            decidedActionEffect: DecidedActionMovementEffectService.new({
                template: ActionEffectMovementTemplateService.new({}),
                destination: { q: 0, r: 1 },
            }),
        })
    expect(actualEffect).toEqual(expectedEffect)
})
