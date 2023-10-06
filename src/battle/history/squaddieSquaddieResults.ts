import {ActionResultPerSquaddie} from "./actionResultPerSquaddie";

export class SquaddieSquaddieResults {
    actingSquaddieDynamicId: string;
    targetedSquaddieDynamicIds: string[];
    resultPerTarget: { [dynamicId: string]: ActionResultPerSquaddie }

    constructor({
                    actingSquaddieDynamicId,
                    targetedSquaddieDynamicIds,
                    resultPerTarget,
                }: {
        actingSquaddieDynamicId?: string;
        targetedSquaddieDynamicIds?: string[];
        resultPerTarget?: { [_: string]: ActionResultPerSquaddie }
    }) {
        this.actingSquaddieDynamicId = actingSquaddieDynamicId ?? "";
        this.targetedSquaddieDynamicIds = targetedSquaddieDynamicIds ?? [];
        this.resultPerTarget = resultPerTarget;
    }
}
