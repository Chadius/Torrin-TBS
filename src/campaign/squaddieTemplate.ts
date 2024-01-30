import {SquaddieId, SquaddieIdService} from "../squaddie/id";
import {ArmyAttributes, ArmyAttributesService, DefaultArmyAttributes} from "../squaddie/armyAttributes";
import {
    TODODELETEMEActionEffectSquaddieTemplate,
    TODODELETEMEActionEffectSquaddieTemplateService
} from "../decision/TODODELETEMEActionEffectSquaddieTemplate";
import {isValidValue} from "../utils/validityCheck";

export interface SquaddieTemplate {
    squaddieId: SquaddieId;
    attributes: ArmyAttributes;
    actions: TODODELETEMEActionEffectSquaddieTemplate[];
}

export const SquaddieTemplateService = {
    new: ({squaddieId, attributes, actions}: {
        squaddieId: SquaddieId,
        attributes?: ArmyAttributes,
        actions?: TODODELETEMEActionEffectSquaddieTemplate[],
    }) => {
        const data: SquaddieTemplate = {
            squaddieId,
            actions: isValidValue(actions) ? actions : [],
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

    data.actions = isValidValue(data.actions) ? data.actions : [];
    data.actions.forEach(TODODELETEMEActionEffectSquaddieTemplateService.sanitize);

    data.attributes = isValidValue(data.attributes) ? data.attributes : DefaultArmyAttributes();
    return data;
}
