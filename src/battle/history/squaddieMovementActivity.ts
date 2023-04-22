import {HexCoordinate} from "../../hexMap/hexGrid";

type SquaddieMovementActivityRequiredOptions = {
    destination: HexCoordinate;
    numberOfActionsSpent: number;
}

export class SquaddieMovementActivity {
    destination: HexCoordinate;
    numberOfActionsSpent: number;

    constructor(options: SquaddieMovementActivityRequiredOptions) {
        this.destination = options.destination;
        this.numberOfActionsSpent = options.numberOfActionsSpent;
    }
}
