import {ActionEffectType} from "../template/actionEffectTemplate";
import {
    ActionEffectSquaddieTemplate,
    ActionEffectSquaddieTemplateService
} from "../template/actionEffectSquaddieTemplate";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {isValidValue} from "../../utils/validityCheck";

export interface DecidedActionSquaddieEffect {
    type: ActionEffectType.SQUADDIE;
    template: ActionEffectSquaddieTemplate;
    target: HexCoordinate;
}

export const DecidedActionSquaddieEffectService = {
    new: ({
              template,
              target,
          }: {
        template: ActionEffectSquaddieTemplate,
        target?: HexCoordinate,
    }): DecidedActionSquaddieEffect => {
        return {
            type: ActionEffectType.SQUADDIE,
            template,
            target,
        }
    },
    areDecisionsRequired: (actionEffect: DecidedActionSquaddieEffect): boolean => {
        return !isValidValue(actionEffect.target);
    },
    getMultipleAttackPenalty: (decidedActionSquaddieEffect: DecidedActionSquaddieEffect): number => {
        return ActionEffectSquaddieTemplateService.getMultipleAttackPenalty(decidedActionSquaddieEffect.template);
    }
}
