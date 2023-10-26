import {HexCoordinate, HexCoordinateData} from "../../hexMap/hexCoordinate/hexCoordinate";

export interface SquaddieMovementActionData {
    destination: HexCoordinateData;
    numberOfActionPointsSpent: number;
}

export class SquaddieMovementAction implements SquaddieMovementActionData {
    destination: HexCoordinate;
    numberOfActionPointsSpent: number;

    constructor(options: {
        destination: HexCoordinateData;
        numberOfActionPointsSpent: number;
    }) {
        this.destination = new HexCoordinate({data: options.destination});
        this.numberOfActionPointsSpent = options.numberOfActionPointsSpent;
    }
}
