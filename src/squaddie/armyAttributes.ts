import {NullSquaddieMovement, SquaddieMovement} from "./movement";

export class ArmyAttributes {
    private _maxHitPoints: number;
    private _armorClass: number;
    private _movement: SquaddieMovement;

    constructor(params: {
        maxHitPoints?: number,
        armorClass?: number,
        movement?: SquaddieMovement,
    }) {
        this._maxHitPoints = params.maxHitPoints ?? 1;
        this._armorClass = params.armorClass ?? 0;
        this._movement = params.movement ?? NullSquaddieMovement();
    }

    get maxHitPoints(): number {
        return this._maxHitPoints;
    }

    get armorClass(): number {
        return this._armorClass;
    }

    get movement(): SquaddieMovement {
        return this._movement;
    }
}

export const NullArmyAttributes = () => {
    return new ArmyAttributes({
        maxHitPoints: 1,
        armorClass: 0,
    })
}
