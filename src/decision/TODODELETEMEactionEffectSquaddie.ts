import {HexCoordinate} from "../hexMap/hexCoordinate/hexCoordinate";
import {TODODELETEMEActionEffectSquaddieTemplate} from "./TODODELETEMEActionEffectSquaddieTemplate";
import {TODODELETEMEActionEffectType} from "./TODODELETEMEactionEffect";
import {isValidValue} from "../utils/validityCheck";

export interface TODODELETEMEactionEffectSquaddie {
    type: TODODELETEMEActionEffectType.SQUADDIE;
    template: TODODELETEMEActionEffectSquaddieTemplate;
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
        template: TODODELETEMEActionEffectSquaddieTemplate;
    }): TODODELETEMEactionEffectSquaddie => {
        return sanitize({
            type: TODODELETEMEActionEffectType.SQUADDIE,
            targetLocation,
            numberOfActionPointsSpent,
            template: template,
        })
    }
};

const sanitize = (actionEffectSquaddie: TODODELETEMEactionEffectSquaddie): TODODELETEMEactionEffectSquaddie => {
    if (!isValidValue(actionEffectSquaddie.numberOfActionPointsSpent) && actionEffectSquaddie.numberOfActionPointsSpent !== 0) {
        actionEffectSquaddie.numberOfActionPointsSpent = actionEffectSquaddie.template.actionPointCost;
    }

    return actionEffectSquaddie;
}
