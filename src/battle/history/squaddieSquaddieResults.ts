import {ActionResultPerSquaddie} from "./actionResultPerSquaddie";

export interface SquaddieSquaddieResults {
    actingBattleSquaddieId: string;
    targetedBattleSquaddieIds: string[];
    actingSquaddieRoll: {
        occurred: boolean;
        rolls: number[];
    };
    resultPerTarget: {
        [battleId: string]: ActionResultPerSquaddie
    };
}
