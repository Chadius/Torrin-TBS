import {DecidedActionSquaddieEffectService} from "./decidedActionSquaddieEffect";
import {ActionEffectSquaddieTemplateService} from "../template/actionEffectSquaddieTemplate";
import {Trait} from "../../trait/traitStatusStorage";

describe('DecidedActionSquaddieEffect', () => {
    describe('areDecisionsRequired', () => {
        it('they are not required if a target is already set', () => {
            const effect = DecidedActionSquaddieEffectService.new({
                template: ActionEffectSquaddieTemplateService.new({}),
                target: {q: 0, r: 0},
            });

            expect(DecidedActionSquaddieEffectService.areDecisionsRequired(effect)).toBeFalsy();
        });
        it('they are required if a target is not set', () => {
            const effect = DecidedActionSquaddieEffectService.new({
                template: ActionEffectSquaddieTemplateService.new({}),
            });

            expect(DecidedActionSquaddieEffectService.areDecisionsRequired(effect)).toBeTruthy();
        });
    });
    describe('can contribute to Multiple Attack Penalty', () => {
        it('does contribute by default if it has an attack', () => {
            const attack = DecidedActionSquaddieEffectService.new({
                template: ActionEffectSquaddieTemplateService.new({
                    traits: {booleanTraits: {[Trait.ATTACK]: true}},
                })
            })

            expect(DecidedActionSquaddieEffectService.getMultipleAttackPenalty(attack)).toEqual(1);
        });
        it('does not contribute if is not an attack', () => {
            const heal = DecidedActionSquaddieEffectService.new({
                template: ActionEffectSquaddieTemplateService.new({})
            })
            expect(DecidedActionSquaddieEffectService.getMultipleAttackPenalty(heal)).toEqual(0);
        });
        it('does not contribute if the trait says it does not', () => {
            const quickAttack = DecidedActionSquaddieEffectService.new({
                template: ActionEffectSquaddieTemplateService.new({
                    traits: {
                        booleanTraits: {
                            [Trait.ATTACK]: true,
                            [Trait.NO_MULTIPLE_ATTACK_PENALTY]: true,
                        }
                    },
                })
            })
            expect(DecidedActionSquaddieEffectService.getMultipleAttackPenalty(quickAttack)).toEqual(0);
        });
    });
});
