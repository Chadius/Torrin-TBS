import {SquaddieMovement} from "./movement";

export class ArmyAttributes {
    constructor(params?: {
        maxHitPoints?: number,
        armorClass?: number,
        movement?: SquaddieMovement,
    }) {
        if (!params) {
            params = {
                maxHitPoints: 1,
                armorClass: 0,
                movement: new SquaddieMovement(),
            };
        }

        this._maxHitPoints = params.maxHitPoints ?? 1;
        this._armorClass = params.armorClass ?? 0;
        this._movement = params.movement ?? new SquaddieMovement();
    }

    private _maxHitPoints: number;

    get maxHitPoints(): number {
        return this._maxHitPoints;
    }

    private _armorClass: number;

    get armorClass(): number {
        return this._armorClass;
    }

    private _movement: SquaddieMovement;

    get movement(): SquaddieMovement {
        return this._movement;
    }
}
