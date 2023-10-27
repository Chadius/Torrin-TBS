import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {SquaddieAction, SquaddieActionData} from "../../squaddie/action";

export interface SquaddieSquaddieActionData {
    squaddieAction: SquaddieActionData;
    numberOfActionPointsSpent: number;
    targetLocation: HexCoordinate;
}

export class SquaddieSquaddieAction implements SquaddieSquaddieActionData {
    private readonly _targetLocation: HexCoordinate;
    private readonly _numberOfActionPointsSpent: number;
    private readonly _squaddieAction: SquaddieAction;

    constructor({targetLocation, squaddieAction, data}: {
        targetLocation?: HexCoordinate;
        squaddieAction?: SquaddieAction;
        data?: SquaddieSquaddieActionData;
    }) {
        if (data) {
            this._targetLocation = data.targetLocation;
            this._squaddieAction = new SquaddieAction({data: data.squaddieAction});
        } else {
            this._targetLocation = targetLocation;
            this._squaddieAction = squaddieAction;
        }

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
