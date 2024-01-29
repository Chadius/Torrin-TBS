import {SquaddieId, SquaddieIdService} from "../squaddie/id";
import {ArmyAttributes, ArmyAttributesService, DefaultArmyAttributes} from "../squaddie/armyAttributes";
import {
    ActionEffectSquaddieTemplate,
    ActionEffectSquaddieTemplateService
} from "../decision/actionEffectSquaddieTemplate";
import {getValidValueOrDefault, isValidValue} from "../utils/validityCheck";
import {ActionTemplate} from "../decision/actionTemplate";

export interface SquaddieTemplate {
    squaddieId: SquaddieId;
    attributes: ArmyAttributes;
    TODODELETEMEactions: ActionEffectSquaddieTemplate[];
    actionTemplates: ActionTemplate[];
}

export const SquaddieTemplateService = {
    new: ({squaddieId, attributes, TODODELETEMEactions, actions}: {
        squaddieId: SquaddieId,
        attributes?: ArmyAttributes,
        TODODELETEMEactions?: ActionEffectSquaddieTemplate[],
        actions?: ActionTemplate[],
    }) => {
        const data: SquaddieTemplate = {
            squaddieId,
            actionTemplates: getValidValueOrDefault(actions, []),
            TODODELETEMEactions: isValidValue(TODODELETEMEactions) ? TODODELETEMEactions : [],
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

    data.TODODELETEMEactions = isValidValue(data.TODODELETEMEactions) ? data.TODODELETEMEactions : [];
    data.TODODELETEMEactions.forEach(ActionEffectSquaddieTemplateService.sanitize);

    data.attributes = isValidValue(data.attributes) ? data.attributes : DefaultArmyAttributes();
    return data;
}
