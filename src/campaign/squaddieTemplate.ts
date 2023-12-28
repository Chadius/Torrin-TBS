import {SquaddieId, SquaddieIdHelper} from "../squaddie/id";
import {ArmyAttributes, ArmyAttributesHelper, DefaultArmyAttributes} from "../squaddie/armyAttributes";
import {SquaddieSquaddieAction, SquaddieSquaddieActionService} from "../squaddie/action";
import {isValidValue} from "../utils/validityCheck";

export interface SquaddieTemplate {
    squaddieId: SquaddieId;
    attributes: ArmyAttributes;
    actions: SquaddieSquaddieAction[];
}

export const SquaddieTemplateHelper = {
    new: ({squaddieId, attributes, actions}: {
        squaddieId: SquaddieId,
        attributes?: ArmyAttributes,
        actions?: SquaddieSquaddieAction[],
    }) => {
        const data: SquaddieTemplate = {
            squaddieId,
            actions: isValidValue(actions) ? actions : [],
            attributes: isValidValue(attributes) ? attributes : ArmyAttributesHelper.default(),
        };
        SquaddieTemplateHelper.sanitize(data);
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
    SquaddieIdHelper.sanitize(data.squaddieId);

    data.actions = isValidValue(data.actions) ? data.actions : [];
    data.actions.forEach(SquaddieSquaddieActionService.sanitize);

    data.attributes = isValidValue(data.attributes) ? data.attributes : DefaultArmyAttributes();
    return data;
}
