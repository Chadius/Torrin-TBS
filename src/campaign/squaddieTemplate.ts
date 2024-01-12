import {SquaddieId, SquaddieIdService} from "../squaddie/id";
import {ArmyAttributes, ArmyAttributesService, DefaultArmyAttributes} from "../squaddie/armyAttributes";
import {
    ActionEffectSquaddieTemplate,
    ActionEffectSquaddieTemplateService
} from "../decision/actionEffectSquaddieTemplate";
import {isValidValue} from "../utils/validityCheck";

export interface SquaddieTemplate {
    squaddieId: SquaddieId;
    attributes: ArmyAttributes;
    actions: ActionEffectSquaddieTemplate[];
}

export const SquaddieTemplateService = {
    new: ({squaddieId, attributes, actions}: {
        squaddieId: SquaddieId,
        attributes?: ArmyAttributes,
        actions?: ActionEffectSquaddieTemplate[],
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
    data.actions.forEach(ActionEffectSquaddieTemplateService.sanitize);

    data.attributes = isValidValue(data.attributes) ? data.attributes : DefaultArmyAttributes();
    return data;
}
