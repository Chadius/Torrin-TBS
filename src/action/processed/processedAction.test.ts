import { ProcessedAction, ProcessedActionService } from "./processedAction"
import { DecidedActionService } from "../decided/decidedAction"
import { ActionEffectMovementTemplateService } from "../template/actionEffectMovementTemplate"
import { ActionEffectSquaddieTemplateService } from "../template/actionEffectSquaddieTemplate"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import { ProcessedActionMovementEffectService } from "./processedActionMovementEffect"
import { DecidedActionMovementEffectService } from "../decided/decidedActionMovementEffect"
import { ProcessedActionSquaddieEffectService } from "./processedActionSquaddieEffect"
import { DecidedActionSquaddieEffectService } from "../decided/decidedActionSquaddieEffect"

describe("ProcessedAction", () => {
    it("creates default values as needed", () => {
        const action = ProcessedActionService.new({
            decidedAction: DecidedActionService.new({
                battleSquaddieId: "",
            }),
        })
        expect(action.processedActionEffects).toHaveLength(0)
    })

    describe("MultipleAttackPenalty", () => {
        it("cannot contribute if it has no effects", () => {
            const justMovement = ProcessedActionService.new({
                decidedAction: DecidedActionService.new({
                    battleSquaddieId: "soldier",
                }),
                processedActionEffects: [],
            })

            expect(
                ProcessedActionService.multipleAttackPenaltyMultiplier(
                    justMovement
                )
            ).toEqual(0)
        })
        it("knows if none of its effect templates contribute", () => {
            const noMAP = ProcessedActionService.new({
                decidedAction: DecidedActionService.new({
                    battleSquaddieId: "soldier",
                }),
                processedActionEffects: [
                    ProcessedActionMovementEffectService.new({
                        decidedActionEffect:
                            DecidedActionMovementEffectService.new({
                                destination: { q: 0, r: 0 },
                                template:
                                    ActionEffectMovementTemplateService.new({}),
                            }),
                    }),
                    ProcessedActionSquaddieEffectService.new({
                        results: undefined,
                        decidedActionEffect:
                            DecidedActionSquaddieEffectService.new({
                                target: { q: 0, r: 0 },
                                template:
                                    ActionEffectSquaddieTemplateService.new({
                                        traits: TraitStatusStorageService.newUsingTraitValues(
                                            {
                                                [Trait.ATTACK]: true,
                                                [Trait.NO_MULTIPLE_ATTACK_PENALTY]:
                                                    true,
                                            }
                                        ),
                                    }),
                            }),
                    }),
                ],
            })

            expect(
                ProcessedActionService.multipleAttackPenaltyMultiplier(noMAP)
            ).toEqual(0)
        })
        it("knows if at least one of its effect templates contributes", () => {
            const withMAP = ProcessedActionService.new({
                decidedAction: DecidedActionService.new({
                    battleSquaddieId: "soldier",
                }),
                processedActionEffects: [
                    ProcessedActionMovementEffectService.new({
                        decidedActionEffect:
                            DecidedActionMovementEffectService.new({
                                destination: { q: 0, r: 0 },
                                template:
                                    ActionEffectMovementTemplateService.new({}),
                            }),
                    }),
                    ProcessedActionSquaddieEffectService.new({
                        results: undefined,
                        decidedActionEffect:
                            DecidedActionSquaddieEffectService.new({
                                target: { q: 0, r: 0 },
                                template:
                                    ActionEffectSquaddieTemplateService.new({
                                        traits: TraitStatusStorageService.newUsingTraitValues(
                                            { [Trait.ATTACK]: true }
                                        ),
                                    }),
                            }),
                    }),
                ],
            })

            expect(
                ProcessedActionService.multipleAttackPenaltyMultiplier(withMAP)
            ).toEqual(1)
        })
    })
})
