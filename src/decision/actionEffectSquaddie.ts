import {HexCoordinate} from "../hexMap/hexCoordinate/hexCoordinate";
import {ActionEffectSquaddieTemplate} from "./actionEffectSquaddieTemplate";
import {ActionEffectType} from "./actionEffect";

export interface ActionEffectSquaddie {
    type: ActionEffectType.SQUADDIE;
    effect: ActionEffectSquaddieTemplate;
    numberOfActionPointsSpent: number;
    targetLocation: HexCoordinate;
}

export const ActionEffectSquaddieService = {
    new: ({
              targetLocation,
              numberOfActionPointsSpent,
              effect,
          }: {
        targetLocation: HexCoordinate;
        numberOfActionPointsSpent: number;
        effect: ActionEffectSquaddieTemplate;
    }): ActionEffectSquaddie => {
        return {
            type: ActionEffectType.SQUADDIE,
            targetLocation,
            numberOfActionPointsSpent,
            effect: effect,
        }
    }
};
