import {ActionResultPerSquaddie} from "./actionResultPerSquaddie";

export interface SquaddieSquaddieResults {
    actingBattleSquaddieId: string;
    targetedBattleSquaddieIds: string[];
    resultPerTarget: {
        [battleId: string]: ActionResultPerSquaddie
    };
}
