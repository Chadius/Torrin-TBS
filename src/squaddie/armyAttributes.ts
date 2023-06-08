export class ArmyAttributes {
    private _maxHitPoints: number;
    private _armorClass: number;

    constructor(params: {
        maxHitPoints: number,
        armorClass: number,
    }) {
        this._maxHitPoints = params.maxHitPoints;
        this._armorClass = params.armorClass;
    }

    get maxHitPoints(): number {
        return this._maxHitPoints;
    }

    get armorClass(): number {
        return this._armorClass;
    }
}

export const NullArmyAttributes = () => {
    return new ArmyAttributes({
        maxHitPoints: 1,
        armorClass: 0,
    })
}
