import {MissionReward} from "./missionReward";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {MissionCondition} from "./missionCondition";

export class MissionObjective {
    get allConditionsAreRequiredToCompleteObjective(): boolean {
        return this._allConditionsAreRequiredToCompleteObjective;
    }

    private _allConditionsAreRequiredToCompleteObjective: boolean;

    get hasGivenReward(): boolean {
        return this._hasGivenReward;
    }

    set hasGivenReward(value: boolean) {
        this._hasGivenReward = value;
    }

    private _hasGivenReward: boolean;

    get isComplete(): boolean {
        return this._isComplete;
    }

    set isComplete(value: boolean) {
        this._isComplete = value;
    }

    private _isComplete: boolean;

    get numberOfRequiredConditionsToComplete(): number {
        return this._numberOfRequiredConditionsToComplete;
    }

    private _numberOfRequiredConditionsToComplete: number;

    get reward(): MissionReward {
        return this._reward;
    }

    private _reward: MissionReward;

    get conditions(): MissionCondition[] {
        return this._conditions;
    }

    private _conditions: MissionCondition[];

    constructor({reward, conditions, numberOfCompletedConditions,}: {
        reward: MissionReward;
        conditions: MissionCondition[],
        numberOfCompletedConditions?: number | "all" | "ALL",
    }) {
        this._reward = reward;
        this._conditions = conditions;
        this.constructNumberOfCompletedConditions(numberOfCompletedConditions);
    }

    private constructNumberOfCompletedConditions(numberOfCompletedConditions: number | "all" | "ALL") {
        if (Number.isInteger(numberOfCompletedConditions)) {
            this._numberOfRequiredConditionsToComplete = Number(numberOfCompletedConditions);
        } else {
            this._numberOfRequiredConditionsToComplete = this.conditions.length;
        }

        if (this._numberOfRequiredConditionsToComplete > this.conditions.length) {
            this._numberOfRequiredConditionsToComplete = this.conditions.length;
        }
        if (this._numberOfRequiredConditionsToComplete === this.conditions.length) {
            this._allConditionsAreRequiredToCompleteObjective = true;
        }
    }

    shouldBeComplete(state: BattleOrchestratorState): boolean {
        if (this.isComplete !== undefined) {
            return this.isComplete;
        }

        const completeConditions = this.conditions.filter((condition: MissionCondition) => {
            return condition.shouldBeComplete(state);
        });

        return completeConditions.length >= this.numberOfRequiredConditionsToComplete;
    }
}
