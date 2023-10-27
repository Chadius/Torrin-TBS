import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";

export interface SquaddieMovementActionData {
    destination: HexCoordinate;
    numberOfActionPointsSpent: number;
}

export class SquaddieMovementAction implements SquaddieMovementActionData {
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
