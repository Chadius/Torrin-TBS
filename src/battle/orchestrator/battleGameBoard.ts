import {MissionObjective} from "../missionResult/missionObjective";
import {MissionReward, MissionRewardType} from "../missionResult/missionReward";
import {DEFAULT_VICTORY_CUTSCENE_ID} from "../orchestratorComponents/battleCutscenePlayer";

export enum BattleCompletionStatus {
    IN_PROGRESS = "IN_PROGRESS",
    VICTORY = "VICTORY",
}

export class BattleGameBoard {
    set completionStatus(value: BattleCompletionStatus) {
        this._completionStatus = value;
    }
    get completionStatus(): BattleCompletionStatus {
        return this._completionStatus;
    }
    get objectives(): MissionObjective[] {
        return this._objectives;
    }

    private _objectives: MissionObjective[];

    private _completionStatus: BattleCompletionStatus;

    constructor({objectives}: {objectives: MissionObjective[]}) {
        this.constructMissionObjective(objectives);
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
