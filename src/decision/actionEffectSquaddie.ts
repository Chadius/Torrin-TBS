import {HexCoordinate} from "../hexMap/hexCoordinate/hexCoordinate";
import {ActionEffectSquaddieTemplate} from "./actionEffectSquaddieTemplate";
import {ActionEffectType} from "./actionEffect";

export interface ActionEffectSquaddie {
    type: ActionEffectType.SQUADDIE;
    template: ActionEffectSquaddieTemplate;
    numberOfActionPointsSpent: number;
    targetLocation: HexCoordinate;
}

export const ActionEffectSquaddieService = {
    new: ({
              targetLocation,
              numberOfActionPointsSpent,
              template,
          }: {
        targetLocation: HexCoordinate;
        numberOfActionPointsSpent: number;
        template: ActionEffectSquaddieTemplate;
    }): ActionEffectSquaddie => {
        return {
            type: ActionEffectType.SQUADDIE,
            targetLocation,
            numberOfActionPointsSpent,
            template: template,
        }
    }
};
