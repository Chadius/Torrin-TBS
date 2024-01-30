import {HexCoordinate} from "../hexMap/hexCoordinate/hexCoordinate";
import {TODODELETEMEActionEffectType} from "./TODODELETEMEactionEffect";

export interface TODODELETEMEactionEffectMovement {
    type: TODODELETEMEActionEffectType.MOVEMENT;
    destination: HexCoordinate;
    numberOfActionPointsSpent: number;
}

export const ActionEffectMovementService = {
    new: ({
              destination,
              numberOfActionPointsSpent,
          }: {
        destination: HexCoordinate;
        numberOfActionPointsSpent: number;
    }): TODODELETEMEactionEffectMovement => {
        return {
            type: TODODELETEMEActionEffectType.MOVEMENT,
            destination,
            numberOfActionPointsSpent,
        }
    }
};
