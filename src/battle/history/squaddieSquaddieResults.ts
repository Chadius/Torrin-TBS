import {ActivityResult} from "./activityResult";

export class SquaddieSquaddieResults {
    actingSquaddieDynamicId: string;
    targetedSquaddieDynamicIds: string[];
    resultPerTarget: { [dynamicId: string]: ActivityResult }

    constructor({
                    actingSquaddieDynamicId,
                    targetedSquaddieDynamicIds,
                    resultPerTarget,
                }: {
        actingSquaddieDynamicId?: string;
        targetedSquaddieDynamicIds?: string[];
        resultPerTarget?: { [_: string]: ActivityResult }
    }) {
        this.actingSquaddieDynamicId = actingSquaddieDynamicId ?? "";
        this.targetedSquaddieDynamicIds = targetedSquaddieDynamicIds ?? [];
        this.resultPerTarget = resultPerTarget;
    }
}
