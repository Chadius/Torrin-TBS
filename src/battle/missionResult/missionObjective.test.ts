import {MissionCondition, MissionConditionType} from "./missionCondition";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {MissionReward, MissionRewardType} from "./missionReward";
import {MissionObjective} from "./missionObjective";

class TestMissionCondition extends MissionCondition {
    hardwiredShouldBeComplete?: boolean;

    constructor(props: { hardwiredShouldBeComplete?: boolean }) {
        super(MissionConditionType.DEFEAT_ALL_ENEMIES);
        this.hardwiredShouldBeComplete = props.hardwiredShouldBeComplete;
    }

    shouldBeComplete(state: BattleOrchestratorState): boolean {
        if (this.isComplete !== undefined) {
            return this.isComplete;
        }
        return this.hardwiredShouldBeComplete;
    }
}

describe('Mission Objective', () => {
    it('is complete when some of the conditions are complete', () => {
        const objective = new MissionObjective({
            reward: new MissionReward({rewardType: MissionRewardType.VICTORY}),
            conditions: [
                new TestMissionCondition({hardwiredShouldBeComplete: true}),
                new TestMissionCondition({hardwiredShouldBeComplete: undefined}),
                new TestMissionCondition({hardwiredShouldBeComplete: undefined}),
            ],
            numberOfCompletedConditions: 2,
        });
        const state = new BattleOrchestratorState({});
        expect(objective.shouldBeComplete(state)).toBeFalsy();

        objective.conditions[1].isComplete = true;
        expect(objective.shouldBeComplete(state)).toBeTruthy();
    });

    it('is can use ALL to indicate all conditions need to be complete', () => {
        const objective = new MissionObjective({
            reward: new MissionReward({rewardType: MissionRewardType.VICTORY}),
            conditions: [
                new TestMissionCondition({hardwiredShouldBeComplete: true}),
                new TestMissionCondition({hardwiredShouldBeComplete: undefined}),
                new TestMissionCondition({hardwiredShouldBeComplete: undefined}),
            ],
            numberOfCompletedConditions: "all"
        });
        expect(objective.numberOfRequiredConditionsToComplete).toBe(3);
        expect(objective.allConditionsAreRequiredToCompleteObjective).toBeTruthy();


        const state = new BattleOrchestratorState({});
        expect(objective.shouldBeComplete(state)).toBeFalsy();

        objective.conditions[1].isComplete = true;
        expect(objective.shouldBeComplete(state)).toBeFalsy();

        objective.conditions[2].isComplete = true;
        expect(objective.shouldBeComplete(state)).toBeTruthy();
    });

    it('will default to all conditions required when an amount is not given', () => {
        const objective = new MissionObjective({
            reward: new MissionReward({rewardType: MissionRewardType.VICTORY}),
            conditions: [
                new TestMissionCondition({hardwiredShouldBeComplete: true}),
                new TestMissionCondition({hardwiredShouldBeComplete: undefined}),
                new TestMissionCondition({hardwiredShouldBeComplete: undefined}),
            ],
        });

        expect(objective.numberOfRequiredConditionsToComplete).toBe(3);
        expect(objective.allConditionsAreRequiredToCompleteObjective).toBeTruthy();

        const state = new BattleOrchestratorState({});
        expect(objective.shouldBeComplete(state)).toBeFalsy();

        objective.conditions[1].isComplete = true;
        objective.conditions[2].isComplete = true;
        expect(objective.shouldBeComplete(state)).toBeTruthy();
    });

    it('is complete if it was already completed', () => {
        const objective = new MissionObjective({
            reward: new MissionReward({rewardType: MissionRewardType.VICTORY}),
            conditions: [
                new TestMissionCondition({hardwiredShouldBeComplete: true}),
                new TestMissionCondition({hardwiredShouldBeComplete: undefined}),
                new TestMissionCondition({hardwiredShouldBeComplete: undefined}),
            ],
            numberOfCompletedConditions: "ALL",
        });
        objective.isComplete = true;

        const state = new BattleOrchestratorState({});
        objective.conditions[2].isComplete = true;
        expect(objective.shouldBeComplete(state)).toBeTruthy();
    });

    it('knows if it gave a reward', () => {
        const objective = new MissionObjective({
            reward: new MissionReward({rewardType: MissionRewardType.VICTORY}),
            conditions: [],
        });

        expect(objective.hasGivenReward).toBeFalsy();
        objective.hasGivenReward = true;
        expect(objective.hasGivenReward).toBeTruthy();
    });

    it('is complete if there are no conditions', () => {
        const objective = new MissionObjective({
            reward: new MissionReward({rewardType: MissionRewardType.VICTORY}),
            conditions: [],
        });
        expect(objective.numberOfRequiredConditionsToComplete).toBe(0);

        const state = new BattleOrchestratorState({});
        expect(objective.shouldBeComplete(state)).toBeTruthy();
    });
});
