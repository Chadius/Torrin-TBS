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
    data.actions = isValidValue(data.actions) ? data.actions : [];
    data.actions.forEach(SquaddieActionHandler.sanitize);
    data.attributes = isValidValue(data.attributes) ? data.attributes : DefaultArmyAttributes();
    if (!isValidValue(data.squaddieId)) {
        throw new Error("squaddieId missing, cannot sanitize");
    }
    SquaddieIdHelper.sanitize(data.squaddieId);
}
