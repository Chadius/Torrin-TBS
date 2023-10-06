import {BattleSquaddieDynamic, BattleSquaddieStatic} from "./battleSquaddie";
import {MissionMap} from "../missionMap/missionMap";
import {HexCoordinate} from "../hexMap/hexCoordinate/hexCoordinate";

export const updateSquaddieLocation = (dynamicSquaddie: BattleSquaddieDynamic, staticSquaddie: BattleSquaddieStatic, destination: HexCoordinate, missionMap: MissionMap, dynamicSquaddieId: string) => {
    let error = missionMap.updateSquaddieLocation(dynamicSquaddieId, destination);
    if (error) {
        throw error;
    }
}

export const spendSquaddieActionPoints = (dynamicSquaddie: BattleSquaddieDynamic, numberOfActionsSpent: number) => {
    dynamicSquaddie.squaddieTurn.spendActionPoints(numberOfActionsSpent);
}
