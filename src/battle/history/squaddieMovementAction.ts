import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {SquaddieActionType} from "./anySquaddieAction";

export interface SquaddieMovementActionData {
    type: SquaddieActionType.MOVEMENT;
    destination: HexCoordinate;
    numberOfActionPointsSpent: number;
}

export const SquaddieMovementActionDataService = {
    new: ({
              destination,
              numberOfActionPointsSpent,
          }: {
        destination: HexCoordinate;
        numberOfActionPointsSpent: number;
    }): SquaddieMovementActionData => {
        return {
            type: SquaddieActionType.MOVEMENT,
            destination,
            numberOfActionPointsSpent,
        }
    }
};
