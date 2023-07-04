import {SquaddieMovement} from "./movement";

export class ArmyAttributes {
    private _maxHitPoints: number;
    private _armorClass: number;
    private _movement: SquaddieMovement;

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
