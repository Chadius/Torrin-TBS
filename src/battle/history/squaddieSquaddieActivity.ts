import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {SquaddieActivity} from "../../squaddie/activity";

export class SquaddieSquaddieActivity {
    private readonly _targetLocation: HexCoordinate;
    private readonly _numberOfActionsSpent: number;
    private readonly _squaddieActivity: SquaddieActivity;

    constructor(options: {
        targetLocation: HexCoordinate;
        squaddieActivity: SquaddieActivity;
    }) {
        this._targetLocation = options.targetLocation;
        this._squaddieActivity = options.squaddieActivity;

        this._numberOfActionsSpent = this._squaddieActivity.actionsToSpend;
    }

    get squaddieActivity(): SquaddieActivity {
        return this._squaddieActivity;
    }

    get numberOfActionsSpent(): number {
        return this._numberOfActionsSpent;
    }

    get targetLocation(): HexCoordinate {
        return this._targetLocation;
    }
}
