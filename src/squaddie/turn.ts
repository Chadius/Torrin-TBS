import {SquaddieSquaddieAction} from "./action";

export enum ACTION_PERFORM_FAILURE_REASON {
    UNKNOWN,
    TOO_FEW_ACTIONS_REMAINING
}

export interface SquaddieTurn {
    remainingActionPoints: number;
}

export const SquaddieTurnHandler = {
    new: (): SquaddieTurn => {
        return {remainingActionPoints: 3};
    },
    spendActionPointsOnAction: (data: SquaddieTurn, action: SquaddieSquaddieAction) => {
        data.remainingActionPoints = (data.remainingActionPoints - action.actionPointCost);
    },
    spendActionPoints: (data: SquaddieTurn, number: number) => {
        data.remainingActionPoints = (data.remainingActionPoints - number);
    },
    canPerformAction: (data: SquaddieTurn, action: SquaddieSquaddieAction): {
        canPerform: boolean,
        reason: ACTION_PERFORM_FAILURE_REASON
    } => {
        if (data.remainingActionPoints < action.actionPointCost) {
            return {
                canPerform: false,
                reason: ACTION_PERFORM_FAILURE_REASON.TOO_FEW_ACTIONS_REMAINING
            }
        }

        return {
            canPerform: true,
            reason: ACTION_PERFORM_FAILURE_REASON.UNKNOWN
        }
    },
    beginNewRound: (data: SquaddieTurn) => {
        refreshActionPoints(data);
    },
    hasActionPointsRemaining: (data: SquaddieTurn): boolean => {
        return data.remainingActionPoints > 0;
    },
    endTurn: (data: SquaddieTurn) => {
        data.remainingActionPoints = 0;
    },
};

const refreshActionPoints = (data: SquaddieTurn) => {
    data.remainingActionPoints = 3;
}
