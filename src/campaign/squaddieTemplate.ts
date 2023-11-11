import {SquaddieId} from "../squaddie/id";
import {ArmyAttributes} from "../squaddie/armyAttributes";
import {SquaddieAction} from "../squaddie/action";

export interface SquaddieTemplate {
    squaddieId: SquaddieId;
    attributes: ArmyAttributes;
    actions: SquaddieAction[];
}
