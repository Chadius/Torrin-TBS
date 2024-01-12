import {HexCoordinate} from "../hexMap/hexCoordinate/hexCoordinate";
import {ActionEffectSquaddieTemplate} from "./actionEffectSquaddieTemplate";
import {ActionEffectType} from "./actionEffect";
import {isValidValue} from "../utils/validityCheck";

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
        numberOfActionPointsSpent?: number;
        template: ActionEffectSquaddieTemplate;
    }): ActionEffectSquaddie => {
        return sanitize({
            type: ActionEffectType.SQUADDIE,
            targetLocation,
            numberOfActionPointsSpent,
            template: template,
        })
    }
};

const sanitize = (actionEffectSquaddie: ActionEffectSquaddie): ActionEffectSquaddie => {
    if (!isValidValue(actionEffectSquaddie.numberOfActionPointsSpent) && actionEffectSquaddie.numberOfActionPointsSpent !== 0) {
        actionEffectSquaddie.numberOfActionPointsSpent = actionEffectSquaddie.template.actionPointCost;
    }

    return actionEffectSquaddie;
}
