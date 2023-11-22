import {MissionObjective, MissionObjectiveHelper} from "../missionResult/missionObjective";
import {MissionRewardType} from "../missionResult/missionReward";
import {MissionCutsceneCollection, MissionCutsceneCollectionHelper} from "./missionCutsceneCollection";
import {CutsceneTrigger} from "../../cutscene/cutsceneTrigger";
import {MissionCompletionStatus} from "../missionResult/missionCompletionStatus";

export enum BattleCompletionStatus {
    IN_PROGRESS = "IN_PROGRESS",
    VICTORY = "VICTORY",
    DEFEAT = "DEFEAT",
}

export interface MissionObjectivesAndCutscenes {
    missionCompletionStatus: MissionCompletionStatus;
    completionStatus: BattleCompletionStatus;
    cutsceneTriggers: CutsceneTrigger[];
    objectives: MissionObjective[];
    cutsceneCollection: MissionCutsceneCollection;
}

export const MissionObjectivesAndCutscenesHelper = {
    new: ({objectives, cutsceneCollection, cutsceneTriggers, missionCompletionStatus}: {
        objectives: MissionObjective[],
        cutsceneCollection: MissionCutsceneCollection,
        cutsceneTriggers: CutsceneTrigger[],
        missionCompletionStatus: MissionCompletionStatus,
    }): MissionObjectivesAndCutscenes => {
        return {
            missionCompletionStatus: missionCompletionStatus,
            cutsceneTriggers: cutsceneTriggers || [],
            completionStatus: BattleCompletionStatus.IN_PROGRESS,
            cutsceneCollection: cutsceneCollection || MissionCutsceneCollectionHelper.new({cutsceneById: {}}),
            objectives: objectives && objectives.length > 0 ? objectives : [
                MissionObjectiveHelper.validateMissionObjective({
                    id: "default",
                    reward: {rewardType: MissionRewardType.VICTORY},
                    conditions: [],
                    hasGivenReward: false,
                    numberOfRequiredConditionsToComplete: 0,
                })
            ],
        };
    }
}
