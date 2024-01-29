import {SquaddieId, SquaddieIdService} from "../squaddie/id";
import {ArmyAttributes, ArmyAttributesService, DefaultArmyAttributes} from "../squaddie/armyAttributes";
import {getValidValueOrDefault, isValidValue} from "../utils/validityCheck";
import {ActionTemplate, ActionTemplateService} from "../decision/actionTemplate";

export interface SquaddieTemplate {
    squaddieId: SquaddieId;
    attributes: ArmyAttributes;
    actionTemplates: ActionTemplate[];
}

export const SquaddieTemplateService = {
    new: ({squaddieId, attributes, actionTemplates}: {
        squaddieId: SquaddieId,
        attributes?: ArmyAttributes,
        actionTemplates?: ActionTemplate[],
    }) => {
        const data: SquaddieTemplate = {
            squaddieId,
            actionTemplates: getValidValueOrDefault(actionTemplates, []),
            attributes: isValidValue(attributes) ? attributes : ArmyAttributesService.default(),
        };
        SquaddieTemplateService.sanitize(data);
        return data;
    },
    sanitize: (data: SquaddieTemplate): SquaddieTemplate => {
        return sanitize(data);
    }
}

const sanitize = (data: SquaddieTemplate): SquaddieTemplate => {
    if (!data.squaddieId || !isValidValue(data.squaddieId)) {
        throw new Error("Squaddie Action cannot sanitize, missing squaddieId ");
    }
    SquaddieIdService.sanitize(data.squaddieId);

    data.actionTemplates = getValidValueOrDefault(data.actionTemplates, []);
    data.actionTemplates.forEach(ActionTemplateService.sanitize);

    data.attributes = isValidValue(data.attributes) ? data.attributes : DefaultArmyAttributes();
    return data;
}
