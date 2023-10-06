import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {SquaddieAction} from "../../squaddie/action";

export class SquaddieSquaddieAction {
    private readonly _targetLocation: HexCoordinate;
    private readonly _numberOfActionPointsSpent: number;
    private readonly _squaddieAction: SquaddieAction;

    constructor(options: {
        targetLocation: HexCoordinate;
        squaddieAction: SquaddieAction;
    }) {
        this._targetLocation = options.targetLocation;
        this._squaddieAction = options.squaddieAction;

        this._numberOfActionPointsSpent = this._squaddieAction.actionPointCost;
    }

    get squaddieAction(): SquaddieAction {
        return this._squaddieAction;
    }

    get numberOfActionPointsSpent(): number {
        return this._numberOfActionPointsSpent;
    }

    get targetLocation(): HexCoordinate {
        return this._targetLocation;
    }
}
