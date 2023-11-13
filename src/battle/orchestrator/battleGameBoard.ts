import {MissionObjective, MissionObjectiveHelper} from "../missionResult/missionObjective";
import {MissionRewardType} from "../missionResult/missionReward";
import {MissionCutsceneCollection} from "./missionCutsceneCollection";
import {CutsceneTrigger} from "../../cutscene/cutsceneTrigger";
import {MissionCompletionStatus} from "../missionResult/missionCompletionStatus";

export enum BattleCompletionStatus {
    IN_PROGRESS = "IN_PROGRESS",
    VICTORY = "VICTORY",
    DEFEAT = "DEFEAT",
}

export class BattleGameBoard {
    private readonly _missionCompletionStatus: MissionCompletionStatus;

    constructor({objectives, cutsceneCollection, cutsceneTriggers, missionCompletionStatus}: {
        objectives: MissionObjective[],
        cutsceneCollection: MissionCutsceneCollection,
        cutsceneTriggers: CutsceneTrigger[],
        missionCompletionStatus: MissionCompletionStatus,
    }) {
        this._cutsceneCollection = cutsceneCollection || new MissionCutsceneCollection({cutsceneById: {}});
        this._cutsceneTriggers = cutsceneTriggers || [];
        this._missionCompletionStatus = missionCompletionStatus;
        this.constructMissionObjective(objectives);
    }

    get missionCompletionStatus(): MissionCompletionStatus {
        return this._missionCompletionStatus;
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
            MissionObjectiveHelper.validateMissionObjective({
                id: "default",
                reward: {rewardType: MissionRewardType.VICTORY},
                conditions: [],
                hasGivenReward: false,
                numberOfRequiredConditionsToComplete: 0,
            })
        ];
    }
}
