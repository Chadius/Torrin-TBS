import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";

export enum MissionConditionType {
    DEFEAT_ALL_ENEMIES = "DEFEAT_ALL_ENEMIES",
    DEFEAT_ALL_PLAYERS = "DEFEAT_ALL_PLAYERS",
    DEFEAT_ALL_ALLIES = "DEFEAT_ALL_ALLIES",
    DEFEAT_ALL_NO_AFFILIATIONS = "DEFEAT_ALL_NO_AFFILIATIONS",
}

export abstract class MissionCondition {
    private readonly _conditionType: MissionConditionType;

    protected constructor(conditionType: MissionConditionType) {
        this.isComplete = undefined;
        this._conditionType = conditionType;
    }

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
