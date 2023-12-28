import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {SquaddieSquaddieAction} from "../../squaddie/action";
import {SquaddieActionType} from "./anySquaddieAction";

export interface SquaddieSquaddieActionData {
    type: SquaddieActionType.SQUADDIE;
    squaddieAction: SquaddieSquaddieAction;
    numberOfActionPointsSpent: number;
    targetLocation: HexCoordinate;
}

export const SquaddieSquaddieActionDataService = {
    new: ({
              targetLocation,
              numberOfActionPointsSpent,
              squaddieAction,
          }: {
        targetLocation: HexCoordinate;
        numberOfActionPointsSpent: number;
        squaddieAction: SquaddieSquaddieAction;
    }): SquaddieSquaddieActionData => {
        return {
            type: SquaddieActionType.SQUADDIE,
            targetLocation,
            numberOfActionPointsSpent,
            squaddieAction,
        }
    }
};
