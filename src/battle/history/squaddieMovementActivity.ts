import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";

export class SquaddieMovementActivity {
    destination: HexCoordinate;
    numberOfActionsSpent: number;

    constructor(options: {
        destination: HexCoordinate;
        numberOfActionsSpent: number;
    }) {
        this.destination = options.destination;
        this.numberOfActionsSpent = options.numberOfActionsSpent;
    }
}
