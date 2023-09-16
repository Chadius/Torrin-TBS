import {ArmyAttributes} from "../../squaddie/armyAttributes";
import {DamageType} from "../../squaddie/squaddieService";

export class InBattleAttributes {
    private readonly _armyAttributes: ArmyAttributes;

    constructor(statBlock?: ArmyAttributes) {
        if (!statBlock) {
            statBlock = new ArmyAttributes();
        }

        this._armyAttributes = statBlock;
        this._currentHitPoints = statBlock.maxHitPoints;
    }

    get armyAttributes(): ArmyAttributes {
        return this._armyAttributes;
    }

    private _currentHitPoints: number;

    get currentHitPoints(): number {
        return this._currentHitPoints;
    }

    takeDamage(damageToTake: number, damageType: DamageType) {
        const startingHitPoints = this.currentHitPoints;

        this._currentHitPoints -= damageToTake;
        if (this._currentHitPoints < 0) {
            this._currentHitPoints = 0;
        }

        return startingHitPoints - this._currentHitPoints;
    }

    receiveHealing(amountHealed: number) {
        const startingHitPoints = this.currentHitPoints;

        this._currentHitPoints += amountHealed;
        if (this._currentHitPoints > this._armyAttributes.maxHitPoints) {
            this._currentHitPoints = this._armyAttributes.maxHitPoints;
        }

        return this._currentHitPoints - startingHitPoints;
    }
}
