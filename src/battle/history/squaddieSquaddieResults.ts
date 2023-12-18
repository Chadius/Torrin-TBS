import {ActionResultPerSquaddie} from "./actionResultPerSquaddie";
import {RollResult} from "../actionCalculator/rollResult";

export interface SquaddieSquaddieResults {
    actingBattleSquaddieId: string;
    targetedBattleSquaddieIds: string[];
    actingSquaddieRoll: RollResult;
    resultPerTarget: {
        [battleId: string]: ActionResultPerSquaddie
    };
}
