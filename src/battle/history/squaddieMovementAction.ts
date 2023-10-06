import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";

export class SquaddieMovementAction {
    destination: HexCoordinate;
    numberOfActionPointsSpent: number;

    constructor(options: {
        destination: HexCoordinate;
        numberOfActionPointsSpent: number;
    }) {
        this.destination = options.destination;
        this.numberOfActionPointsSpent = options.numberOfActionPointsSpent;
    }
}
