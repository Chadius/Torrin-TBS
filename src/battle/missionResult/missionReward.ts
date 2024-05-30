export enum MissionRewardType {
    VICTORY = "VICTORY",
    DEFEAT = "DEFEAT",
}

export interface MissionReward {
    rewardType: MissionRewardType
}
