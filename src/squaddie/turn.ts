import {SquaddieActionData} from "./action";

export enum ACTION_PERFORM_FAILURE_REASON {
    UNKNOWN,
    TOO_FEW_ACTIONS_REMAINING
}

export class SquaddieTurn {
    constructor() {
        this._remainingActionPoints = 3;
    }

    private _remainingActionPoints: number;

    get remainingActionPoints(): number {
        return this._remainingActionPoints;
    }

    spendActionPointsOnAction(action: SquaddieActionData) {
        this._remainingActionPoints = (this._remainingActionPoints - action.actionPointCost);
    }

    spendActionPoints(number: number) {
        this._remainingActionPoints = (this._remainingActionPoints - number);
    }

    canPerformAction(action: SquaddieActionData): { canPerform: boolean, reason: ACTION_PERFORM_FAILURE_REASON } {
        if (this._remainingActionPoints < action.actionPointCost) {
            return {
                canPerform: false,
                reason: ACTION_PERFORM_FAILURE_REASON.TOO_FEW_ACTIONS_REMAINING
            }
        }

        return {
            canPerform: true,
            reason: ACTION_PERFORM_FAILURE_REASON.UNKNOWN
        }
    }

    beginNewRound() {
        this.refreshActionPoints();
    }

    hasActionPointsRemaining(): boolean {
        return this._remainingActionPoints > 0;
    }

    endTurn() {
        this._remainingActionPoints = 0;
    }

    private refreshActionPoints() {
        this._remainingActionPoints = 3;
    }
}
