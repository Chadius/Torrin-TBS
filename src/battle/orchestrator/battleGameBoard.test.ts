import {MissionObjective} from "../missionResult/missionObjective";
import {MissionReward, MissionRewardType} from "../missionResult/missionReward";
import {BattleGameBoard} from "./battleGameBoard";
import {MissionConditionDefeatAllEnemies} from "../missionResult/missionConditionDefeatAllEnemies";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";

describe('Battle Game Board', () => {
    it('creates an instant win objective if none is given', () => {
        const gameBoard: BattleGameBoard = new BattleGameBoard({objectives: [], cutsceneCollection: undefined});

        expect(gameBoard.objectives.length).toBeGreaterThanOrEqual(1);

        const victory = gameBoard.objectives.find((objective: MissionObjective) =>
            objective.reward.rewardType === MissionRewardType.VICTORY
        );
        expect(victory).not.toBeUndefined();
    });
    it('uses the given conditions when set later', () => {
        const gameBoard: BattleGameBoard = new BattleGameBoard({objectives: [], cutsceneCollection: undefined});
        gameBoard.objectives = [
            new MissionObjective({
                reward: new MissionReward({
                    rewardType: MissionRewardType.VICTORY,
                }),
                conditions: [
                    new MissionConditionDefeatAllEnemies({squaddieRepository: new BattleSquaddieRepository()})
                ],
                cutsceneToPlayUponCompletion: "default_victory",
                numberOfCompletedConditions: "all",
            })
        ];

        expect(gameBoard.objectives[0].numberOfRequiredConditionsToComplete).toBe(1);
    });
});
