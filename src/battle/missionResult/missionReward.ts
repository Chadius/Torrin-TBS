export enum MissionRewardType {
    VICTORY = "VICTORY",
    DEFEAT = "DEFEAT",
}

export class MissionReward {
    private readonly _rewardType: MissionRewardType;

    constructor({rewardType}: { rewardType: MissionRewardType }) {
        this._rewardType = rewardType;
    }

    get rewardType() {
        return this._rewardType;
    }
}
