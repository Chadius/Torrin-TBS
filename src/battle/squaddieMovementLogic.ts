import {BattleSquaddie} from "./battleSquaddie";
import {MissionMap} from "../missionMap/missionMap";
import {SquaddieTemplate} from "../campaign/squaddieTemplate";
import {HexCoordinate} from "../hexMap/hexCoordinate/hexCoordinate";
import {SquaddieTurnHandler} from "../squaddie/turn";

export const updateSquaddieLocation = (battleSquaddie: BattleSquaddie, squaddieTemplate: SquaddieTemplate, destination: HexCoordinate, missionMap: MissionMap, battleSquaddieId: string) => {
    let error = missionMap.updateSquaddieLocation(battleSquaddieId, destination);
    if (error) {
        throw error;
    }
}

export const spendSquaddieActionPoints = (battleSquaddie: BattleSquaddie, numberOfActionsSpent: number) => {
    SquaddieTurnHandler.spendActionPoints(battleSquaddie.squaddieTurn, numberOfActionsSpent);
}
