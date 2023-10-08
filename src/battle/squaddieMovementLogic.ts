import {BattleSquaddie} from "./battleSquaddie";
import {MissionMap} from "../missionMap/missionMap";
import {HexCoordinate} from "../hexMap/hexCoordinate/hexCoordinate";
import {SquaddieTemplate} from "../campaign/squaddieTemplate";

export const updateSquaddieLocation = (dynamicSquaddie: BattleSquaddie, squaddietemplate: SquaddieTemplate, destination: HexCoordinate, missionMap: MissionMap, dynamicSquaddieId: string) => {
    let error = missionMap.updateSquaddieLocation(dynamicSquaddieId, destination);
    if (error) {
        throw error;
    }
}

export const spendSquaddieActionPoints = (dynamicSquaddie: BattleSquaddie, numberOfActionsSpent: number) => {
    dynamicSquaddie.squaddieTurn.spendActionPoints(numberOfActionsSpent);
}
