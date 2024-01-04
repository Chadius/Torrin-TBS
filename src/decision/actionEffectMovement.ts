import {HexCoordinate} from "../hexMap/hexCoordinate/hexCoordinate";
import {ActionEffectType} from "./actionEffect";

export interface ActionEffectMovement {
    type: ActionEffectType.MOVEMENT;
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
    }): ActionEffectMovement => {
        return {
            type: ActionEffectType.MOVEMENT,
            destination,
            numberOfActionPointsSpent,
        }
    }
};
