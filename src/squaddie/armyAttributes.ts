import {SquaddieMovement} from "./movement";

export class ArmyAttributes {
    constructor(params?: {
        maxHitPoints?: number,
        armorClass?: number,
        movement?: SquaddieMovement,
    }) {
        const defaultMovement: SquaddieMovement = new SquaddieMovement({
            movementPerAction: 2,
            crossOverPits: false,
            passThroughWalls: false,
        });

        if (!params) {
            params = {
                maxHitPoints: 1,
                armorClass: 0,
                movement: defaultMovement,
            };
        }

        this._maxHitPoints = params.maxHitPoints ?? 1;
        this._armorClass = params.armorClass ?? 0;
        this._movement = params.movement ?? defaultMovement;
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
