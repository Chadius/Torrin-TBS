import {ActivityResultOnSquaddie} from "./activityResultOnSquaddie";

export class SquaddieSquaddieResults {
    actingSquaddieDynamicId: string;
    targetedSquaddieDynamicIds: string[];
    resultPerTarget: { [dynamicId: string]: ActivityResultOnSquaddie }

    constructor({
                    actingSquaddieDynamicId,
                    targetedSquaddieDynamicIds,
                    resultPerTarget,
                }: {
        actingSquaddieDynamicId?: string;
        targetedSquaddieDynamicIds?: string[];
        resultPerTarget?: { [_: string]: ActivityResultOnSquaddie }
    }) {
        this.actingSquaddieDynamicId = actingSquaddieDynamicId ?? "";
        this.targetedSquaddieDynamicIds = targetedSquaddieDynamicIds ?? [];
        this.resultPerTarget = resultPerTarget;
    }
}
