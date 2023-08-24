import {MissionObjective} from "../missionResult/missionObjective";
import {MissionReward, MissionRewardType} from "../missionResult/missionReward";

export class BattleGameBoard {
    get objectives(): MissionObjective[] {
        return this._objectives;
    }

    private _objectives: MissionObjective[];

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
            })
        ];
    }
}
