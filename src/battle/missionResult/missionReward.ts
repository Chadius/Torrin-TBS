export const MissionRewardType = {
    VICTORY: "VICTORY",
    DEFEAT: "DEFEAT",
} as const satisfies Record<string, string>
export type TMissionRewardType = EnumLike<typeof MissionRewardType>

export interface MissionReward {
    rewardType: TMissionRewardType
}
