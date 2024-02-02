import {DecidedAction} from "../decided/decidedAction";
import {ProcessedActionEffect} from "./processedActionEffect";
import {getValidValueOrDefault} from "../../utils/validityCheck";
import {ActionEffectType} from "../template/actionEffectTemplate";
import {MULTIPLE_ATTACK_PENALTY_MULTIPLIER_MAX} from "../../battle/modifierConstants";
import {ProcessedActionSquaddieEffectService} from "./processedActionSquaddieEffect";

export interface ProcessedAction {
    decidedAction: DecidedAction;
    processedActionEffects: ProcessedActionEffect[];
}

export const ProcessedActionService = {
    new: ({
              decidedAction,
              processedActionEffects,
          }: {
        decidedAction: DecidedAction,
        processedActionEffects?: ProcessedActionEffect[]
    }): ProcessedAction => {
        return sanitize({
            decidedAction,
            processedActionEffects,
        });
    },
    multipleAttackPenaltyMultiplier: (processedAction: ProcessedAction): number => {
        const getMAPFromProcessedActionEffect = (accumulator: number, processedActionEffect: ProcessedActionEffect): number => {
            if (processedActionEffect.type !== ActionEffectType.SQUADDIE) {
                return accumulator;
            }

            if (processedActionEffect.decidedActionEffect.type !== ActionEffectType.SQUADDIE) {
                return accumulator;
            }

            return accumulator + ProcessedActionSquaddieEffectService.getMultipleAttackPenalty(processedActionEffect);
        }

        return Math.min(
            processedAction.processedActionEffects.reduce(
                getMAPFromProcessedActionEffect,
                0
            ),
            MULTIPLE_ATTACK_PENALTY_MULTIPLIER_MAX
        );
    }
}

const sanitize = (processedAction: ProcessedAction): ProcessedAction => {
    processedAction.processedActionEffects = getValidValueOrDefault(processedAction.processedActionEffects, []);
    return processedAction;
}
