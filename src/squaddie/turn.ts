import {ActionTemplate} from "../action/template/actionTemplate";

export const DEFAULT_ACTION_POINTS_PER_TURN = 3;

export enum ACTION_PERFORM_FAILURE_REASON {
    UNKNOWN,
    TOO_FEW_ACTIONS_REMAINING
}

export interface SquaddieTurn {
    remainingActionPoints: number;
}

export const SquaddieTurnService = {
    new: (): SquaddieTurn => {
        return {remainingActionPoints: DEFAULT_ACTION_POINTS_PER_TURN};
    },
    spendActionPoints: (data: SquaddieTurn, number: number) => {
        data.remainingActionPoints = (data.remainingActionPoints - number);
    },
    canPerformAction: (data: SquaddieTurn, actionTemplate: ActionTemplate): {
        canPerform: boolean,
        reason: ACTION_PERFORM_FAILURE_REASON
    } => {
        if (data.remainingActionPoints < actionTemplate.actionPoints) {
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
    data.remainingActionPoints = DEFAULT_ACTION_POINTS_PER_TURN;
}
