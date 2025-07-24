import {
    MissionObjective,
    MissionObjectiveHelper,
} from "../missionResult/missionObjective"
import { MissionRewardType } from "../missionResult/missionReward"
import {
    MissionCutsceneCollection,
    MissionCutsceneCollectionHelper,
} from "./missionCutsceneCollection"
import { BattleEvent, BattleEventService } from "../event/battleEvent"
import { MissionCompletionStatus } from "../missionResult/missionCompletionStatus"

export enum BattleCompletionStatus {
    IN_PROGRESS = "IN_PROGRESS",
    VICTORY = "VICTORY",
    DEFEAT = "DEFEAT",
}

export interface MissionObjectivesAndCutscenes {
    missionCompletionStatus: MissionCompletionStatus
    battleCompletionStatus: BattleCompletionStatus
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
        battleCompletionStatus: BattleCompletionStatus
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
                          MissionObjectiveHelper.validateMissionObjective({
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
