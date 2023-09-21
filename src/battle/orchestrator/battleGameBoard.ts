import {MissionObjective} from "../missionResult/missionObjective";
import {MissionReward, MissionRewardType} from "../missionResult/missionReward";
import {MissionCutsceneCollection} from "./missionCutsceneCollection";
import {CutsceneTrigger} from "../../cutscene/cutsceneTrigger";

export enum BattleCompletionStatus {
    IN_PROGRESS = "IN_PROGRESS",
    VICTORY = "VICTORY",
    DEFEAT = "DEFEAT",
}

export class BattleGameBoard {
    constructor({objectives, cutsceneCollection, cutsceneTriggers}: {
        objectives: MissionObjective[],
        cutsceneCollection: MissionCutsceneCollection,
        cutsceneTriggers: CutsceneTrigger[],
    }) {
        this._cutsceneCollection = cutsceneCollection || new MissionCutsceneCollection({cutsceneById: {}});
        this._cutsceneTriggers = cutsceneTriggers || [];
        this.constructMissionObjective(objectives);
    }

    private _cutsceneTriggers: CutsceneTrigger[];

    get cutsceneTriggers(): CutsceneTrigger[] {
        return this._cutsceneTriggers;
    }

    set cutsceneTriggers(value: CutsceneTrigger[]) {
        this._cutsceneTriggers = value;
    }

    private _objectives: MissionObjective[];

    get objectives(): MissionObjective[] {
        return this._objectives;
    }

    set objectives(value: MissionObjective[]) {
        this.constructMissionObjective(value);
    }

    private _completionStatus: BattleCompletionStatus;

    get completionStatus(): BattleCompletionStatus {
        return this._completionStatus;
    }

    set completionStatus(value: BattleCompletionStatus) {
        this._completionStatus = value;
    }

    private _cutsceneCollection: MissionCutsceneCollection;

    get cutsceneCollection(): MissionCutsceneCollection {
        return this._cutsceneCollection;
    }

    set cutsceneCollection(value: MissionCutsceneCollection) {
        this._cutsceneCollection = value;
    }

    private constructMissionObjective(objectives: MissionObjective[]) {
        if (objectives && objectives.length > 0) {
            this._objectives = objectives;
            return;
        }

        this._objectives = [
            new MissionObjective({
                reward: new MissionReward({rewardType: MissionRewardType.VICTORY}),
                conditions: [],
            })
        ];
    }
}
