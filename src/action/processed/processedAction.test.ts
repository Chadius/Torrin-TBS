import {ProcessedAction, ProcessedActionService} from "./processedAction";
import {DecidedActionService} from "../decided/decidedAction";
import {ActionTemplateService} from "../template/actionTemplate";
import {ActionEffectMovementTemplateService} from "../template/actionEffectMovementTemplate";
import {ActionEffectSquaddieTemplateService} from "../template/actionEffectSquaddieTemplate";
import {Trait, TraitStatusStorageService} from "../../trait/traitStatusStorage";
import {ProcessedActionMovementEffectService} from "./processedActionMovementEffect";
import {DecidedActionMovementEffectService} from "../decided/decidedActionMovementEffect";

describe('ProcessedAction', () => {
    it('creates default values as needed', () => {
        const action = ProcessedActionService.new({
            decidedAction: DecidedActionService.new({
                battleSquaddieId: "",
            })
        });
        expect(action.processedActionEffects).toHaveLength(0);
    });

    describe('MultipleAttackPenalty', () => {
        it('cannot contribute if it has no effects', () => {
            const justMovement = ProcessedActionService.new({
                decidedAction: DecidedActionService.new({
                    battleSquaddieId: "soldier",
                }),
                processedActionEffects: [
                    ProcessedActionMovementEffectService.new({
                        decidedActionEffect: DecidedActionMovementEffectService.new({
                            destination: {q: 0, r: 0},
                            template: ActionEffectMovementTemplateService.new({}),
                        })
                    })
                ],
            })

            expect(ProcessedActionService.multipleAttackPenaltyMultiplier(justMovement)).toEqual(0);
        });
        // it('knows if none of its effect templates contribute', () => {
        //     const noMAP = ActionTemplateService.new({
        //         name: "quick slap",
        //         actionEffectTemplates: [
        //             ActionEffectMovementTemplateService.new({}),
        //             ActionEffectSquaddieTemplateService.new({
        //                 traits: TraitStatusStorageService.newUsingTraitValues({
        //                     [Trait.NO_MULTIPLE_ATTACK_PENALTY]: true,
        //                     [Trait.ATTACK]: true,
        //                 }),
        //             }),
        //         ],
        //     });
        //     expect(ActionTemplateService.multipleAttackPenaltyMultiplier(noMAP)).toEqual(0);
        // });
        // it('knows if at least one of its effect templates contributes', () => {
        //     const withMap = ActionTemplateService.new({
        //         name: "sword strike",
        //         actionEffectTemplates: [
        //             ActionEffectMovementTemplateService.new({}),
        //             ActionEffectSquaddieTemplateService.new({
        //                 traits: TraitStatusStorageService.newUsingTraitValues({
        //                     [Trait.ATTACK]: true,
        //                 }),
        //             }),
        //         ],
        //     });
        //     expect(ActionTemplateService.multipleAttackPenaltyMultiplier(withMap)).toEqual(1);
        // });
    });
});
