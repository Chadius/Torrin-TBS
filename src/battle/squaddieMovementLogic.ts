import {BattleSquaddieDynamic, BattleSquaddieStatic} from "./battleSquaddie";
import {HexCoordinate} from "../hexMap/hexGrid";
import {MissionMap} from "../missionMap/missionMap";

export const updateSquaddieLocation = (dynamicSquaddie: BattleSquaddieDynamic, staticSquaddie: BattleSquaddieStatic, destination: HexCoordinate, missionMap: MissionMap) => {
    dynamicSquaddie.mapLocation = destination;
    missionMap.updateSquaddiePosition(staticSquaddie.squaddieId.id, dynamicSquaddie.mapLocation);
}

export const spendSquaddieActions = (dynamicSquaddie: BattleSquaddieDynamic, numberOfActionsSpent: number) => {
    dynamicSquaddie.squaddieTurn.spendNumberActions(numberOfActionsSpent);
}