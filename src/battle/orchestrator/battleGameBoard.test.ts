import {MissionObjective, MissionObjectiveHelper} from "../missionResult/missionObjective";
import {MissionRewardType} from "../missionResult/missionReward";
import {BattleGameBoard} from "./battleGameBoard";
import {MissionConditionType} from "../missionResult/missionCondition";

describe('Battle Game Board', () => {
    it('creates an instant win objective if none is given', () => {
        const gameBoard: BattleGameBoard = new BattleGameBoard({
            objectives: [],
            cutsceneCollection: undefined,
            cutsceneTriggers: [],
            missionCompletionStatus: {},
        });

        expect(gameBoard.objectives.length).toBeGreaterThanOrEqual(1);

        const victory = gameBoard.objectives.find((objective: MissionObjective) =>
            objective.reward.rewardType === MissionRewardType.VICTORY
        );
        expect(victory).not.toBeUndefined();
    });
    it('uses the given conditions when set later', () => {
        const gameBoard: BattleGameBoard = new BattleGameBoard({
            objectives: [],
            cutsceneCollection: undefined,
            cutsceneTriggers: [],
            missionCompletionStatus: {},
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
