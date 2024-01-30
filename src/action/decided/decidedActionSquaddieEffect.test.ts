import {DecidedActionSquaddieEffectService} from "./decidedActionSquaddieEffect";
import {ActionEffectSquaddieTemplateService} from "../template/actionEffectSquaddieTemplate";

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
});
