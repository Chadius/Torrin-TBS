import {MissionReward} from "./missionReward";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {MissionCondition} from "./missionCondition";

export class MissionObjective {
    private readonly _reward: MissionReward;
    private readonly _conditions: MissionCondition[];

    constructor({reward, conditions, numberOfCompletedConditions}: {
        reward: MissionReward;
        conditions: MissionCondition[],
        numberOfCompletedConditions?: number | "all" | "ALL",
    }) {
        this._reward = reward;
        this._conditions = conditions;
        this.constructNumberOfCompletedConditions(numberOfCompletedConditions);
    }

    private _allConditionsAreRequiredToCompleteObjective: boolean;

    get allConditionsAreRequiredToCompleteObjective(): boolean {
        return this._allConditionsAreRequiredToCompleteObjective;
    }

    private _hasGivenReward: boolean;

    get hasGivenReward(): boolean {
        return this._hasGivenReward;
    }

    set hasGivenReward(value: boolean) {
        this._hasGivenReward = value;
    }

    private _isComplete: boolean;

    get isComplete(): boolean {
        return this._isComplete;
    }

    set isComplete(value: boolean) {
        this._isComplete = value;
    }

    private _numberOfRequiredConditionsToComplete: number;

    get numberOfRequiredConditionsToComplete(): number {
        return this._numberOfRequiredConditionsToComplete;
    }

    get reward(): MissionReward {
        return this._reward;
    }

    get conditions(): MissionCondition[] {
        return this._conditions;
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
}
