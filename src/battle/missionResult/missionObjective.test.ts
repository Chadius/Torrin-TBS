import * as mc from "./missionCondition";
import {MissionCondition, MissionConditionType} from "./missionCondition";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {MissionReward, MissionRewardType} from "./missionReward";
import {MissionObjective} from "./missionObjective";

describe('Mission Objective', () => {
    const mockMissionConditionChecks = (stubReturnValues: { [key: string]: boolean | undefined }) => {
        jest.spyOn(mc, "MissionShouldBeComplete").mockImplementation(
            (missionCondition: MissionCondition, state: BattleOrchestratorState, _: string): boolean => {
                return stubReturnValues[missionCondition.id];
            }
        );
    }

    it('is complete when some of the conditions are complete', () => {
        const objective = new MissionObjective({
            id: "test objective",
            reward: new MissionReward({rewardType: MissionRewardType.VICTORY}),
            conditions: [
                {
                    type: MissionConditionType.DEFEAT_ALL_ENEMIES,
                    id: "test0",
                },
                {
                    type: MissionConditionType.DEFEAT_ALL_ENEMIES,
                    id: "test1",
                },
                {
                    type: MissionConditionType.DEFEAT_ALL_ENEMIES,
                    id: "test2",
                },
            ],
            numberOfCompletedConditions: 2,
        });

        const state = new BattleOrchestratorState({
            missionCompletionStatus: {
                "test objective": {
                    isComplete: undefined,
                    conditions: {
                        "test0": true,
                        "test1": undefined,
                        "test2": undefined,
                    }
                }
            }
        });

        mockMissionConditionChecks({
            "test0": true,
            "test1": undefined,
            "test2": undefined,
        });
        expect(objective.shouldBeComplete(state)).toBeFalsy();

        jest.clearAllMocks();
        mockMissionConditionChecks({
            "test0": true,
            "test1": true,
            "test2": undefined,
        });
        expect(objective.shouldBeComplete(state)).toBeTruthy();
    });

    it('is can use ALL to indicate all conditions need to be complete', () => {
        const objective = new MissionObjective({
            id: "test objective",
            reward: new MissionReward({rewardType: MissionRewardType.VICTORY}),
            conditions: [
                {
                    type: MissionConditionType.DEFEAT_ALL_ENEMIES,
                    id: "test0",
                },
                {
                    type: MissionConditionType.DEFEAT_ALL_ENEMIES,
                    id: "test1",
                },
                {
                    type: MissionConditionType.DEFEAT_ALL_ENEMIES,
                    id: "test2",
                },
            ],
            numberOfCompletedConditions: "all"
        });

        mockMissionConditionChecks({
            "test0": true,
            "test1": undefined,
            "test2": undefined,
        });
        expect(objective.numberOfRequiredConditionsToComplete).toBe(3);
        expect(objective.allConditionsAreRequiredToCompleteObjective).toBeTruthy();

        const state = new BattleOrchestratorState({
            missionCompletionStatus: {
                "test objective": {
                    isComplete: undefined,
                    conditions: {
                        "test0": true,
                        "test1": undefined,
                        "test2": undefined,
                    }
                }
            }
        });
        expect(objective.shouldBeComplete(state)).toBeFalsy();

        jest.clearAllMocks();
        mockMissionConditionChecks({
            "test0": true,
            "test1": true,
            "test2": undefined,
        });
        expect(objective.shouldBeComplete(state)).toBeFalsy();

        jest.clearAllMocks();
        mockMissionConditionChecks({
            "test0": true,
            "test1": true,
            "test2": true,
        });
        expect(objective.shouldBeComplete(state)).toBeTruthy();
    });

    it('will default to all conditions required when an amount is not given', () => {
        const objective = new MissionObjective({
            id: "test objective",
            reward: new MissionReward({rewardType: MissionRewardType.VICTORY}),
            conditions: [
                {
                    type: MissionConditionType.DEFEAT_ALL_ENEMIES,
                    id: "test0",
                },
                {
                    type: MissionConditionType.DEFEAT_ALL_ENEMIES,
                    id: "test1",
                },
                {
                    type: MissionConditionType.DEFEAT_ALL_ENEMIES,
                    id: "test2",
                },
            ],
        });
        mockMissionConditionChecks({
            "test0": true,
            "test1": undefined,
            "test2": undefined,
        });
        expect(objective.numberOfRequiredConditionsToComplete).toBe(3);
        expect(objective.allConditionsAreRequiredToCompleteObjective).toBeTruthy();

        const state = new BattleOrchestratorState({
            missionCompletionStatus: {
                "test objective": {
                    isComplete: undefined,
                    conditions: {
                        "test0": true,
                        "test1": undefined,
                        "test2": undefined,
                    }
                }
            }
        });
        expect(objective.shouldBeComplete(state)).toBeFalsy();

        jest.clearAllMocks();
        mockMissionConditionChecks({
            "test0": true,
            "test1": true,
            "test2": true,
        });
        expect(objective.shouldBeComplete(state)).toBeTruthy();
    });

    it('is complete if it was already completed', () => {
        const objective = new MissionObjective({
            id: "test objective",
            reward: new MissionReward({rewardType: MissionRewardType.VICTORY}),
            conditions: [
                {
                    type: MissionConditionType.DEFEAT_ALL_ENEMIES,
                    id: "test0",
                },
                {
                    type: MissionConditionType.DEFEAT_ALL_ENEMIES,
                    id: "test1",
                },
                {
                    type: MissionConditionType.DEFEAT_ALL_ENEMIES,
                    id: "test2",
                },
            ],
            numberOfCompletedConditions: "ALL",
        });
        const state = new BattleOrchestratorState({
            missionCompletionStatus: {
                "test objective": {
                    isComplete: true,
                    conditions: {
                        "test0": false,
                        "test1": false,
                        "test2": false,
                    }
                }
            }
        });
        jest.clearAllMocks();
        mockMissionConditionChecks({
            "test0": false,
            "test1": false,
            "test2": false,
        });
        expect(objective.shouldBeComplete(state)).toBeTruthy();
    });

    it('knows if it gave a reward', () => {
        const objective = new MissionObjective({
            id: "test objective",
            reward: new MissionReward({rewardType: MissionRewardType.VICTORY}),
            conditions: [],
        });

        expect(objective.hasGivenReward).toBeFalsy();
        objective.hasGivenReward = true;
        expect(objective.hasGivenReward).toBeTruthy();
    });

    it('is complete if there are no conditions', () => {
        const objective = new MissionObjective({
            id: "test objective",
            reward: new MissionReward({rewardType: MissionRewardType.VICTORY}),
            conditions: [],
        });
        expect(objective.numberOfRequiredConditionsToComplete).toBe(0);

        const state = new BattleOrchestratorState({
            missionCompletionStatus: {
                "test objective": {
                    isComplete: undefined,
                    conditions: {}
                }
            }
        });
        expect(objective.shouldBeComplete(state)).toBeTruthy();
    });
});
