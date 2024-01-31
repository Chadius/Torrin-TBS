import {DecidedAction} from "../decided/decidedAction";
import {ProcessedActionEffect} from "./processedActionEffect";
import {getValidValueOrDefault} from "../../utils/validityCheck";
import {ActionEffectType} from "../template/actionEffectTemplate";
import {Trait, TraitStatusStorageService} from "../../trait/traitStatusStorage";
import {ActionEffectSquaddieTemplateService} from "../template/actionEffectSquaddieTemplate";
import {DecidedActionSquaddieEffectService} from "../decided/decidedActionSquaddieEffect";

export interface ProcessedAction {
    decidedAction: DecidedAction;
    processedActionEffects: ProcessedActionEffect[];
}

export const ProcessedActionService = {
    new: ({
              decidedAction,
              processedActionEffects,
          }:{
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

            return accumulator + DecidedActionSquaddieEffectService.getMultipleAttackPenalty(processedActionEffect.decidedActionEffect);
        }

        return processedAction.processedActionEffects.reduce(
            getMAPFromProcessedActionEffect,
            0
        );
    }
}

const sanitize = (processedAction: ProcessedAction): ProcessedAction => {
    processedAction.processedActionEffects = getValidValueOrDefault(processedAction.processedActionEffects, []);
    return processedAction;
}
