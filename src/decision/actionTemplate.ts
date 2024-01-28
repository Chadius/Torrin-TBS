import {ActionEffectTemplate} from "./actionEffectTemplate";
import {Trait, TraitStatusStorageHelper} from "../trait/traitStatusStorage";
import {ActionRange} from "../squaddie/actionRange";
import {assertsInteger} from "../utils/mathAssert";
import {getValidValueOrDefault, isValidValue} from "../utils/validityCheck";

export interface ActionTemplate {
    name: string;
    id: string;
    actionEffectTemplates: ActionEffectTemplate[];
    actionPointCost: number;
    traits: {
        booleanTraits: { [key in Trait]?: boolean };
    };
}

export const ActionTemplateService = {
    new: ({
              id,
              name,
              actionEffectTemplates,
              actionPointCost,
              traits,
          }: {
        id: string;
        name: string;
        actionEffectTemplates?: ActionEffectTemplate[];
        actionPointCost?: number;
        traits?: {
            booleanTraits: { [key in Trait]?: boolean };
        };
    } & Partial<ActionRange>): ActionTemplate => {
        if (actionPointCost !== undefined) {
            assertsInteger(actionPointCost);
        } else {
            actionPointCost = 1;
        }

        const data: ActionTemplate = {
            id: id,
            name: name,
            actionPointCost: actionPointCost,
            traits: traits,
            actionEffectTemplates: getValidValueOrDefault(actionEffectTemplates, []),
        };

        sanitize(data);
        return data;
    },
    sanitize: (data: ActionTemplate): ActionTemplate => {
        return sanitize(data);
    },
}

const sanitize = (data: ActionTemplate): ActionTemplate => {
    if (!data.id || !isValidValue(data.id)) {
        throw new Error('ActionTemplate cannot sanitize, missing id');
    }
    if (!data.name || !isValidValue(data.name)) {
        throw new Error('ActionTemplate cannot sanitize, missing name');
    }

    data.traits = getValidValueOrDefault(data.traits, TraitStatusStorageHelper.newUsingTraitValues({}));
    return data;
}
