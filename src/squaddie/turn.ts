import {SquaddieActivity} from "./activity";

export enum ACTIVITY_PERFORM_FAILURE_REASON {
    UNKNOWN,
    TOO_FEW_ACTIONS_REMAINING
}

export class SquaddieTurn {
    private _remainingNumberOfActions: number;

    constructor() {
        this._remainingNumberOfActions = 3;
    }

    get remainingNumberOfActions(): number {
        return this._remainingNumberOfActions;
    }

    spendActionsOnActivity(activity: SquaddieActivity) {
        this._remainingNumberOfActions = (this._remainingNumberOfActions - activity.actionsToSpend);
    }

    spendNumberActions(numberOfActions: number) {
        this._remainingNumberOfActions = (this._remainingNumberOfActions - numberOfActions);
    }

    canPerformActivity(activity: SquaddieActivity): { canPerform: boolean, reason: ACTIVITY_PERFORM_FAILURE_REASON } {
        if (this._remainingNumberOfActions < activity.actionsToSpend) {
            return {
                canPerform: false,
                reason: ACTIVITY_PERFORM_FAILURE_REASON.TOO_FEW_ACTIONS_REMAINING
            }
        }

        return {
            canPerform: true,
            reason: ACTIVITY_PERFORM_FAILURE_REASON.UNKNOWN
        }
    }

    beginNewRound() {
        this.refreshActions();
    }

    private refreshActions() {
        this._remainingNumberOfActions = 3;
    }

    hasActionsRemaining(): boolean {
        return this._remainingNumberOfActions > 0;
    }

    endTurn() {
        this._remainingNumberOfActions = 0;
    }
}
