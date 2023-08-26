import {MissionObjective} from "../missionResult/missionObjective";
import {MissionReward, MissionRewardType} from "../missionResult/missionReward";
import {DEFAULT_VICTORY_CUTSCENE_ID, MissionCutsceneCollection} from "./missionCutsceneCollection";

export enum BattleCompletionStatus {
    IN_PROGRESS = "IN_PROGRESS",
    VICTORY = "VICTORY",
}

export class BattleGameBoard {
    constructor({objectives, cutsceneCollection}: { objectives: MissionObjective[], cutsceneCollection: MissionCutsceneCollection }) {
        this._cutsceneCollection = cutsceneCollection || new MissionCutsceneCollection({cutsceneById: {}});
        this.constructMissionObjective(objectives);
    }

    private _objectives: MissionObjective[];

    get objectives(): MissionObjective[] {
        return this._objectives;
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
        if (objectives) {
            this._objectives = objectives;
        }

        this._objectives = [
            new MissionObjective({
                reward: new MissionReward({rewardType: MissionRewardType.VICTORY}),
                conditions: [],
                cutsceneToPlayUponCompletion: DEFAULT_VICTORY_CUTSCENE_ID,
            })
        ];
    }
}
