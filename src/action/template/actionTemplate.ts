import {ActionEffectTemplate, ActionEffectType} from "./actionEffectTemplate";
import {getValidValueOrDefault, isValidValue} from "../../utils/validityCheck";
import {Trait, TraitStatusStorageService} from "../../trait/traitStatusStorage";

export interface ActionTemplate {
    id: string;
    name: string;
    actionPoints: number;
    actionEffectTemplates: ActionEffectTemplate[];
}

export const ActionTemplateService = {
    new: ({
              id,
              name,
              actionEffectTemplates,
              actionPoints,
          }: {
        id?: string,
        name: string,
        actionEffectTemplates?: ActionEffectTemplate[],
        actionPoints?: number;
    }): ActionTemplate => {
        return sanitize({
            id,
            name,
            actionEffectTemplates,
            actionPoints,
        })
    },
    multipleAttackPenaltyMultiplier: (actionTemplate: ActionTemplate): number => {
        const getMAPFromActionEffectTemplate = (accumulator: number, actionEffect: ActionEffectTemplate): number => {
            if (actionEffect.type !== ActionEffectType.SQUADDIE) {
                return accumulator;
            }

            if (TraitStatusStorageService.getStatus(actionEffect.traits, Trait.ATTACK) !== true) {
                return accumulator;
            }

            const map = TraitStatusStorageService.getStatus(actionEffect.traits, Trait.NO_MULTIPLE_ATTACK_PENALTY) ? 0 : 1;
            return accumulator + map;
        }

        return actionTemplate.actionEffectTemplates.reduce(
            getMAPFromActionEffectTemplate,
            0
        );
    }
}

const sanitize = (template: ActionTemplate): ActionTemplate => {
    if (!isValidValue(template.name)) {
        throw new Error("ActionTemplate cannot sanitize, no name found");
    }

    template.actionPoints = getValidValueOrDefault(template.actionPoints, 1);
    template.actionEffectTemplates = getValidValueOrDefault(template.actionEffectTemplates, []);
    return template;
}
