import {MissionReward} from "./missionReward";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {MissionCondition, MissionShouldBeComplete} from "./missionCondition";
import {MissionCompletionStatus} from "./missionCompletionStatus";

export class MissionObjective {
    private readonly _reward: MissionReward;
    private readonly _conditions: MissionCondition[];
    private readonly _id: string;

    constructor({id, reward, conditions, numberOfCompletedConditions}: {
        reward: MissionReward;
        conditions: MissionCondition[],
        numberOfCompletedConditions?: number | "all" | "ALL",
        id: string,
    }) {
        this._id = id;
        this._reward = reward;
        this._conditions = conditions;
        this.constructNumberOfCompletedConditions(numberOfCompletedConditions);
    }

    get id(): string {
        return this._id;
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
        const missionCompletionStatus: MissionCompletionStatus = state.missionCompletionStatus;

        if (missionCompletionStatus[this.id].isComplete !== undefined) {
            return missionCompletionStatus[this.id].isComplete;
        }
        const completeConditions = this.conditions.filter((condition: MissionCondition) => {
            return MissionShouldBeComplete(condition, state, this.id);
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
