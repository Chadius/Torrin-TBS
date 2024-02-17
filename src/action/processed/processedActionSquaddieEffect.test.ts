import {ProcessedActionSquaddieEffectService} from "./processedActionSquaddieEffect";
import {DecidedActionSquaddieEffectService} from "../decided/decidedActionSquaddieEffect";
import {ActionEffectSquaddieTemplateService} from "../template/actionEffectSquaddieTemplate";
import {Trait} from "../../trait/traitStatusStorage";

describe('Processed Action Squaddie Effect', () => {
    it('will set results to undefined if it is not provided', () => {
        const effect = ProcessedActionSquaddieEffectService.new({
            decidedActionEffect: DecidedActionSquaddieEffectService.new({
                template: ActionEffectSquaddieTemplateService.new({}),
                target: {q: 0, r: 0},
            })
        });

        expect(effect.results).toBeUndefined();
    });
    describe('getMultipleAttackPenalty', () => {
        it('does contribute by default if it has an attack', () => {
            const attack = ProcessedActionSquaddieEffectService.new({
                decidedActionEffect: DecidedActionSquaddieEffectService.new({
                    template: ActionEffectSquaddieTemplateService.new({
                        traits: {booleanTraits: {[Trait.ATTACK]: true}},
                    })
                })
            });

            expect(ProcessedActionSquaddieEffectService.getMultipleAttackPenalty(attack)).toEqual(1);
        });
        it('does not contribute if is not an attack', () => {
            const heal = ProcessedActionSquaddieEffectService.new({
                decidedActionEffect: DecidedActionSquaddieEffectService.new({
                    template: ActionEffectSquaddieTemplateService.new({})
                })
            });
            expect(ProcessedActionSquaddieEffectService.getMultipleAttackPenalty(heal)).toEqual(0);
        });
        it('does not contribute if the trait says it does not', () => {
            const quickAttack = ProcessedActionSquaddieEffectService.new({
                decidedActionEffect: DecidedActionSquaddieEffectService.new({
                    template: ActionEffectSquaddieTemplateService.new({
                        traits: {
                            booleanTraits: {
                                [Trait.ATTACK]: true,
                                [Trait.NO_MULTIPLE_ATTACK_PENALTY]: true,
                            }
                        },
                    })
                })
            });
            expect(ProcessedActionSquaddieEffectService.getMultipleAttackPenalty(quickAttack)).toEqual(0);
        });
    });
});
