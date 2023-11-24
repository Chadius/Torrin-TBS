import * as mc from "./missionCondition";
import {MissionCondition, MissionConditionType} from "./missionCondition";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {MissionRewardType} from "./missionReward";
import {MissionObjectiveHelper} from "./missionObjective";
import {BattleStateHelper} from "../orchestrator/battleState";

describe('Mission Objective', () => {
    const mockMissionConditionChecks = (stubReturnValues: {
        [key: string]: boolean | undefined
    }) => {
        jest.spyOn(mc, "MissionShouldBeComplete").mockImplementation(
            (missionCondition: MissionCondition, state: BattleOrchestratorState, _: string): boolean => {
                return stubReturnValues[missionCondition.id];
            }
        );
    }

    it('is complete when some of the conditions are complete', () => {
        const objective = MissionObjectiveHelper.validateMissionObjective({
            id: "test objective",
            reward: {rewardType: MissionRewardType.VICTORY},
            hasGivenReward: false,
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
            numberOfRequiredConditionsToComplete: 2,
        });

        const state = new BattleOrchestratorState({
            squaddieRepository: undefined,
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            battleState: BattleStateHelper.newBattleState({
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
            }),
        });

        mockMissionConditionChecks({
            "test0": true,
            "test1": undefined,
            "test2": undefined,
        });
        expect(MissionObjectiveHelper.shouldBeComplete(objective, state)).toBeFalsy();

        jest.clearAllMocks();
        mockMissionConditionChecks({
            "test0": true,
            "test1": true,
            "test2": undefined,
        });
        expect(MissionObjectiveHelper.shouldBeComplete(objective, state)).toBeTruthy();
    });

    it('is can use ALL to indicate all conditions need to be complete', () => {
        const objective = MissionObjectiveHelper.validateMissionObjective({
            id: "test objective",
            reward: {rewardType: MissionRewardType.VICTORY},
            hasGivenReward: false,
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
            numberOfRequiredConditionsToComplete: "all"
        });

        mockMissionConditionChecks({
            "test0": true,
            "test1": undefined,
            "test2": undefined,
        });
        expect(objective.numberOfRequiredConditionsToComplete).toBe(3);
        expect(MissionObjectiveHelper.allConditionsAreRequiredToCompleteObjective(objective)).toBeTruthy();

        const state = new BattleOrchestratorState({
            squaddieRepository: undefined,
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            battleState: BattleStateHelper.newBattleState({
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
            }),
        });
        expect(MissionObjectiveHelper.shouldBeComplete(objective, state)).toBeFalsy();

        jest.clearAllMocks();
        mockMissionConditionChecks({
            "test0": true,
            "test1": true,
            "test2": undefined,
        });
        expect(MissionObjectiveHelper.shouldBeComplete(objective, state)).toBeFalsy();

        jest.clearAllMocks();
        mockMissionConditionChecks({
            "test0": true,
            "test1": true,
            "test2": true,
        });
        expect(MissionObjectiveHelper.shouldBeComplete(objective, state)).toBeTruthy();
    });

    it('will default to all conditions required when an amount is not given', () => {
        const objective = MissionObjectiveHelper.validateMissionObjective({
            id: "test objective",
            reward: {rewardType: MissionRewardType.VICTORY},
            numberOfRequiredConditionsToComplete: "ALL",
            hasGivenReward: false,
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
        expect(MissionObjectiveHelper.allConditionsAreRequiredToCompleteObjective(objective)).toBeTruthy();

        const state = new BattleOrchestratorState({
            squaddieRepository: undefined,
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            battleState: BattleStateHelper.newBattleState({
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
            }),
        });
        expect(MissionObjectiveHelper.shouldBeComplete(objective, state)).toBeFalsy();

        jest.clearAllMocks();
        mockMissionConditionChecks({
            "test0": true,
            "test1": true,
            "test2": true,
        });
        expect(MissionObjectiveHelper.shouldBeComplete(objective, state)).toBeTruthy();
    });

    it('is complete if it was already completed', () => {
        const objective = MissionObjectiveHelper.validateMissionObjective({
            id: "test objective",
            reward: {rewardType: MissionRewardType.VICTORY},
            hasGivenReward: false,
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
            numberOfRequiredConditionsToComplete: "ALL",
        });
        const state = new BattleOrchestratorState({
            squaddieRepository: undefined,
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            battleState: BattleStateHelper.newBattleState({
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
            }),
        });
        jest.clearAllMocks();
        mockMissionConditionChecks({
            "test0": false,
            "test1": false,
            "test2": false,
        });
        expect(MissionObjectiveHelper.shouldBeComplete(objective, state)).toBeTruthy();
    });

    it('knows if it gave a reward', () => {
        const objective = MissionObjectiveHelper.validateMissionObjective({
            id: "test objective",
            reward: {rewardType: MissionRewardType.VICTORY},
            numberOfRequiredConditionsToComplete: 0,
            hasGivenReward: false,
            conditions: [],
        });

        expect(objective.hasGivenReward).toBeFalsy();
        objective.hasGivenReward = true;
        expect(objective.hasGivenReward).toBeTruthy();
    });

    it('is complete if there are no conditions', () => {
        const objective = MissionObjectiveHelper.validateMissionObjective({
            id: "test objective",
            reward: {rewardType: MissionRewardType.VICTORY},
            hasGivenReward: false,
            numberOfRequiredConditionsToComplete: 0,
            conditions: [],
        });
        expect(objective.numberOfRequiredConditionsToComplete).toBe(0);

        const state = new BattleOrchestratorState({
            squaddieRepository: undefined,
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            battleState: BattleStateHelper.newBattleState({
                missionCompletionStatus: {
                    "test objective": {
                        isComplete: undefined,
                        conditions: {}
                    }
                }
            }),
        });
        expect(MissionObjectiveHelper.shouldBeComplete(objective, state)).toBeTruthy();
    });
});
