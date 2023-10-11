import {SquaddieId} from "../squaddie/id";
import {ArmyAttributes} from "../squaddie/armyAttributes";
import {SquaddieAction} from "../squaddie/action";
import {SquaddieMovement} from "../squaddie/movement";

export class SquaddieTemplate {
    squaddieId: SquaddieId;
    attributes: ArmyAttributes;
    private readonly _action: SquaddieAction[];

    constructor(options: {
        squaddieId: SquaddieId,
        actions?: SquaddieAction[],
        attributes?: ArmyAttributes,
    }) {
        this.squaddieId = options.squaddieId;
        this._action = options.actions || [];
        this.attributes = options.attributes || new ArmyAttributes();
    }

    get action(): SquaddieAction[] {
        return this._action;
    }

    get movement(): SquaddieMovement {
        return this.attributes.movement;
    }

    get templateId(): string {
        return this.squaddieId.templateId;
    }

    addAction(action: SquaddieAction) {
        this._action.push(action);
    }
}
