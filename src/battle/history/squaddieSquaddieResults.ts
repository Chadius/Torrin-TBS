import {ActionResultPerSquaddie} from "./actionResultPerSquaddie";

export class SquaddieSquaddieResults {
    actingBattleSquaddieId: string;
    targetedBattleSquaddieIds: string[];
    resultPerTarget: { [battleId: string]: ActionResultPerSquaddie }

    constructor({
                    actingBattleSquaddieId,
                    targetedBattleSquaddieIds,
                    resultPerTarget,
                }: {
        actingBattleSquaddieId?: string;
        targetedBattleSquaddieIds?: string[];
        resultPerTarget?: { [_: string]: ActionResultPerSquaddie }
    }) {
        this.actingBattleSquaddieId = actingBattleSquaddieId ?? "";
        this.targetedBattleSquaddieIds = targetedBattleSquaddieIds ?? [];
        this.resultPerTarget = resultPerTarget;
    }
}
