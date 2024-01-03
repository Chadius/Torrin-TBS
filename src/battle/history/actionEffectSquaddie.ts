import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {SquaddieSquaddieAction} from "../../squaddie/action";
import {ActionEffectType} from "../../squaddie/actionEffect";

export interface ActionEffectSquaddie {
    type: ActionEffectType.SQUADDIE;
    squaddieAction: SquaddieSquaddieAction;
    numberOfActionPointsSpent: number;
    targetLocation: HexCoordinate;
}

export const ActionEffectSquaddieService = {
    new: ({
              targetLocation,
              numberOfActionPointsSpent,
              squaddieAction,
          }: {
        targetLocation: HexCoordinate;
        numberOfActionPointsSpent: number;
        squaddieAction: SquaddieSquaddieAction;
    }): ActionEffectSquaddie => {
        return {
            type: ActionEffectType.SQUADDIE,
            targetLocation,
            numberOfActionPointsSpent,
            squaddieAction,
        }
    }
};
