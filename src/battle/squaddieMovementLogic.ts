import {BattleSquaddieDynamic, BattleSquaddieStatic} from "./battleSquaddie";
import {HexCoordinate} from "../hexMap/hexGrid";
import {MissionMap} from "../missionMap/missionMap";

export const updateSquaddieLocation = (dynamicSquaddie: BattleSquaddieDynamic, staticSquaddie: BattleSquaddieStatic, destination: HexCoordinate, missionMap: MissionMap, dynamicSquaddieId: string) => {
    let error = missionMap.updateSquaddieLocation(dynamicSquaddieId, destination);
    if (error) {
        throw error;
    }
}

export const spendSquaddieActions = (dynamicSquaddie: BattleSquaddieDynamic, numberOfActionsSpent: number) => {
    dynamicSquaddie.squaddieTurn.spendNumberActions(numberOfActionsSpent);
}
