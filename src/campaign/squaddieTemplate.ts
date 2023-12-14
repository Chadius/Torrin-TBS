import {SquaddieId, SquaddieIdHelper} from "../squaddie/id";
import {ArmyAttributes, DefaultArmyAttributes} from "../squaddie/armyAttributes";
import {SquaddieAction, SquaddieActionHandler} from "../squaddie/action";
import {isValidValue} from "../utils/validityCheck";

export interface SquaddieTemplate {
    squaddieId: SquaddieId;
    attributes: ArmyAttributes;
    actions: SquaddieAction[];
}

export const SquaddieTemplateHelper = {
    sanitize(data: SquaddieTemplate) {
        sanitize(data);
    }
}

const sanitize = (data: SquaddieTemplate) => {
    if (!data.squaddieId || !isValidValue(data.squaddieId)) {
        throw new Error("Squaddie Action cannot sanitize, missing squaddieId ");
    }
    SquaddieIdHelper.sanitize(data.squaddieId);

    data.actions = isValidValue(data.actions) ? data.actions : [];
    data.actions.forEach(SquaddieActionHandler.sanitize);

    data.attributes = isValidValue(data.attributes) ? data.attributes : DefaultArmyAttributes();
}
