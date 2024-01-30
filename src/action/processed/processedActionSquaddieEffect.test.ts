import {ProcessedActionSquaddieEffectService} from "./processedActionSquaddieEffect";
import {DecidedActionSquaddieEffectService} from "../decided/decidedActionSquaddieEffect";
import {ActionEffectSquaddieTemplateService} from "../template/actionEffectSquaddieTemplate";

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
});
