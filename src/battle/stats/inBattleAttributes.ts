import {ArmyAttributes} from "../../squaddie/armyAttributes";

export class InBattleAttributes {
    private _armyAttributes: ArmyAttributes;
    private _currentHitPoints: number;

    constructor(statBlock?: ArmyAttributes) {
        if (!statBlock) {
            statBlock = new ArmyAttributes();
        }

        this._armyAttributes = statBlock;
        this._currentHitPoints = statBlock.maxHitPoints;
    }

    get currentHitPoints(): number {
        return this._currentHitPoints;
    }
}
