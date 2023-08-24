import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";

export enum MissionConditionType {
    DEFEAT_ALL_ENEMIES = "DEFEAT_ALL_ENEMIES"
}

export abstract class MissionCondition {
    protected constructor(conditionType: MissionConditionType) {
        this.isComplete = undefined;
        this._conditionType = conditionType;
    }

    private _conditionType: MissionConditionType;

    get conditionType(): MissionConditionType {
        return this._conditionType;
    }

    private _isComplete?: boolean;

    get isComplete(): boolean {
        return this._isComplete;
    }

    set isComplete(value: boolean) {
        this._isComplete = value;
    }

    shouldBeComplete(state: BattleOrchestratorState): boolean {
        return false;
    }
}
