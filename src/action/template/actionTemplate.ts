import {ActionEffectTemplate, ActionEffectType} from "./actionEffectTemplate";
import {getValidValueOrDefault, isValidValue} from "../../utils/validityCheck";
import {Trait, TraitStatusStorageService} from "../../trait/traitStatusStorage";
import {ActionEffectSquaddieTemplateService} from "./actionEffectSquaddieTemplate";

export interface ActionTemplate {
    id: string;
    name: string;
    actionPoints: number;
    actionEffectTemplates: ActionEffectTemplate[];
    buttonIconResourceKey: string;
}

export const ActionTemplateService = {
    new: ({
              id,
              name,
              actionEffectTemplates,
              actionPoints,
              buttonIconResourceKey,
          }: {
        id?: string,
        name: string,
        actionEffectTemplates?: ActionEffectTemplate[],
        actionPoints?: number;
        buttonIconResourceKey?: string;
    }): ActionTemplate => {
        return sanitize({
            id,
            name,
            actionEffectTemplates,
            actionPoints,
            buttonIconResourceKey,
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
    },
    sanitize: (template: ActionTemplate): ActionTemplate => {
        return sanitize(template);
    }
}

const sanitize = (template: ActionTemplate): ActionTemplate => {
    if (!isValidValue(template.name)) {
        throw new Error("ActionTemplate cannot sanitize, no name found");
    }

    template.actionPoints = getValidValueOrDefault(template.actionPoints, 1);
    template.actionEffectTemplates = getValidValueOrDefault(template.actionEffectTemplates, []);
    template.actionEffectTemplates.forEach((actionEffectTemplate, index) => {
        switch (actionEffectTemplate.type) {
            case ActionEffectType.SQUADDIE:
                ActionEffectSquaddieTemplateService.sanitize(actionEffectTemplate);
                break;
            case ActionEffectType.MOVEMENT:
                break;
            case ActionEffectType.END_TURN:
                break;
            default:
                throw new Error(`ActionTemplate ${template.id} cannot sanitize, actionEffectTemplate ${index} is missing type`);
        }
    });
    return template;
}
