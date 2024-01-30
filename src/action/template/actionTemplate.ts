import {ActionEffectTemplate} from "./actionEffectTemplate";
import {getValidValueOrDefault, isValidValue} from "../../utils/validityCheck";

export interface ActionTemplate {
    id: string;
    name: string;
    actionEffectTemplates: ActionEffectTemplate[];
}

export const ActionTemplateService = {
    new: ({
        id,
        name,
        actionEffectTemplates,
          }: {
        id?: string,
        name: string,
        actionEffectTemplates?: ActionEffectTemplate[],
    }): ActionTemplate => {
        return sanitize ({
            id,
            name,
            actionEffectTemplates,
        })
    }
}

const sanitize = (template: ActionTemplate): ActionTemplate => {
    if (!isValidValue(template.name)) {
        throw new Error("ActionTemplate cannot sanitize, no name found");
    }

    template.actionEffectTemplates = getValidValueOrDefault(template.actionEffectTemplates, []);
    return template;
}
