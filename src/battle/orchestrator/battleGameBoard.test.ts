import {MissionObjective} from "../missionResult/missionObjective";
import {MissionRewardType} from "../missionResult/missionReward";
import {BattleGameBoard} from "./battleGameBoard";

describe('Battle Game Board', () => {
    it('creates an instant win objective if none is given', () => {
        const gameBoard: BattleGameBoard = new BattleGameBoard({objectives: [], cutsceneCollection: undefined});

        expect(gameBoard.objectives.length).toBeGreaterThanOrEqual(1);

        const victory = gameBoard.objectives.find((objective: MissionObjective) =>
            objective.reward.rewardType === MissionRewardType.VICTORY
        );
        expect(victory).not.toBeUndefined();
    });
});
