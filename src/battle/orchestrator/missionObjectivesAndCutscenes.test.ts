import {MissionObjective, MissionObjectiveHelper} from "../missionResult/missionObjective";
import {MissionRewardType} from "../missionResult/missionReward";
import {
    BattleCompletionStatus,
    MissionObjectivesAndCutscenes,
    MissionObjectivesAndCutscenesHelper
} from "./missionObjectivesAndCutscenes";
import {MissionConditionType} from "../missionResult/missionCondition";

describe('Mission Objectives and Cutscenes', () => {
    it('creates an instant win objective if none is given', () => {
        const gameBoard: MissionObjectivesAndCutscenes = MissionObjectivesAndCutscenesHelper.new({
            objectives: [],
            cutsceneCollection: undefined,
            cutsceneTriggers: [],
            missionCompletionStatus: {},
            battleCompletionStatus: BattleCompletionStatus.IN_PROGRESS,
        });

        expect(gameBoard.objectives.length).toBeGreaterThanOrEqual(1);

        const victory = gameBoard.objectives.find((objective: MissionObjective) =>
            objective.reward.rewardType === MissionRewardType.VICTORY
        );
        expect(victory).not.toBeUndefined();
    });
    it('uses the given conditions when set later', () => {
        const gameBoard: MissionObjectivesAndCutscenes = MissionObjectivesAndCutscenesHelper.new({
            objectives: [],
            cutsceneCollection: undefined,
            cutsceneTriggers: [],
            missionCompletionStatus: {},
            battleCompletionStatus: BattleCompletionStatus.IN_PROGRESS,
        });
        gameBoard.objectives = [
            MissionObjectiveHelper.validateMissionObjective({
                id: "test",
                hasGivenReward: false,
                reward: {
                    rewardType: MissionRewardType.VICTORY,
                },
                conditions: [
                    {
                        id: "test",
                        type: MissionConditionType.DEFEAT_ALL_ENEMIES,
                    },
                ],
                numberOfRequiredConditionsToComplete: "all",
            })
        ];

        expect(gameBoard.objectives[0].numberOfRequiredConditionsToComplete).toBe(1);
    });
});
