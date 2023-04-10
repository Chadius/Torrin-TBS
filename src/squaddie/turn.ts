import {SquaddieActivity} from "./activity";

export enum ACTIVITY_PERFORM_FAILURE_REASON {
    UNKNOWN,
    TOO_FEW_ACTIONS_REMAINING
}

export class SquaddieTurn {
    remainingNumberOfActions: number;

    constructor() {
        this.remainingNumberOfActions = 3;
    }

    getRemainingActions(): number {
        return this.remainingNumberOfActions;
    }

    spendActionsOnActivity(activity: SquaddieActivity) {
        this.remainingNumberOfActions = (this.remainingNumberOfActions - activity.actionsToSpend);
    }

    spendNumberActions(numberOfActions: number) {
        this.remainingNumberOfActions = (this.remainingNumberOfActions - numberOfActions);
    }

    canPerformActivity(activity: SquaddieActivity): { canPerform: boolean, reason: ACTIVITY_PERFORM_FAILURE_REASON } {
        if (this.remainingNumberOfActions < activity.actionsToSpend) {
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
        this.remainingNumberOfActions = 3;
    }

    hasActionsRemaining(): boolean {
        return this.remainingNumberOfActions > 0;
    }
}
