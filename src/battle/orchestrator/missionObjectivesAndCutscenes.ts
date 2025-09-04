import {
    MissionObjective,
    MissionObjectiveService,
} from "../missionResult/missionObjective"
import { MissionRewardType } from "../missionResult/missionReward"
import {
    MissionCutsceneCollection,
    MissionCutsceneCollectionHelper,
} from "./missionCutsceneCollection"
import { BattleEvent, BattleEventService } from "../event/battleEvent"
import { MissionCompletionStatus } from "../missionResult/missionCompletionStatus"

export const BattleCompletionStatus = {
    IN_PROGRESS: "IN_PROGRESS",
    VICTORY: "VICTORY",
    DEFEAT: "DEFEAT",
} as const satisfies Record<string, string>
export type TBattleCompletionStatus = EnumLike<typeof BattleCompletionStatus>

export interface MissionObjectivesAndCutscenes {
    missionCompletionStatus: MissionCompletionStatus
    battleCompletionStatus: TBattleCompletionStatus
    battleEvents: BattleEvent[]
    objectives: MissionObjective[]
    cutsceneCollection: MissionCutsceneCollection
}

export const MissionObjectivesAndCutscenesHelper = {
    new: ({
        objectives,
        cutsceneCollection,
        battleEvents,
        missionCompletionStatus,
        battleCompletionStatus,
    }: {
        objectives: MissionObjective[]
        cutsceneCollection: MissionCutsceneCollection
        battleEvents: BattleEvent[]
        missionCompletionStatus: MissionCompletionStatus
        battleCompletionStatus: TBattleCompletionStatus
    }): MissionObjectivesAndCutscenes => {
        return sanitize({
            missionCompletionStatus: missionCompletionStatus,
            battleEvents: battleEvents || [],
            battleCompletionStatus: battleCompletionStatus,
            cutsceneCollection:
                cutsceneCollection ||
                MissionCutsceneCollectionHelper.new({
                    cutsceneById: {},
                }),
            objectives:
                objectives && objectives.length > 0
                    ? objectives
                    : [
                          MissionObjectiveService.validateMissionObjective({
                              id: "default",
                              reward: { rewardType: MissionRewardType.VICTORY },
                              conditions: [],
                              hasGivenReward: false,
                              numberOfRequiredConditionsToComplete: 0,
                          }),
                      ],
        })
    },
    sanitize: (missionObjectivesAndCutscenes: MissionObjectivesAndCutscenes) =>
        sanitize(missionObjectivesAndCutscenes),
}

const sanitize = (
    missionObjectivesAndCutscenes: MissionObjectivesAndCutscenes
) => {
    missionObjectivesAndCutscenes.battleEvents.forEach((battleEvent) => {
        BattleEventService.sanitize(battleEvent)
    })
    return missionObjectivesAndCutscenes
}
