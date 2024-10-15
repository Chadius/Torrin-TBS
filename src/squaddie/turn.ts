import { ActionTemplate } from "../action/template/actionTemplate"

import { ActionPointCost } from "../battle/history/battleAction/battleAction"

export const DEFAULT_ACTION_POINTS_PER_TURN = 3

export enum ActionPerformFailureReason {
    UNKNOWN,
    TOO_FEW_ACTIONS_REMAINING,
}

export interface SquaddieTurn {
    remainingActionPoints: number
}

export const SquaddieTurnService = {
    new: (): SquaddieTurn => {
        return { remainingActionPoints: DEFAULT_ACTION_POINTS_PER_TURN }
    },
    spendActionPoints: (
        data: SquaddieTurn,
        actionPointCost: ActionPointCost
    ) => {
        if (actionPointCost === "End Turn") {
            data.remainingActionPoints = 0
            return
        }
        data.remainingActionPoints =
            data.remainingActionPoints - actionPointCost
    },
    canPerformAction: (
        data: SquaddieTurn,
        actionTemplate: ActionTemplate
    ): {
        canPerform: boolean
        reason: ActionPerformFailureReason
    } => {
        if (data.remainingActionPoints < actionTemplate.actionPoints) {
            return {
                canPerform: false,
                reason: ActionPerformFailureReason.TOO_FEW_ACTIONS_REMAINING,
            }
        }

        return {
            canPerform: true,
            reason: ActionPerformFailureReason.UNKNOWN,
        }
    },
    beginNewRound: (data: SquaddieTurn) => {
        refreshActionPoints(data)
    },
    hasActionPointsRemaining: (data: SquaddieTurn): boolean => {
        return data.remainingActionPoints > 0
    },
    endTurn: (data: SquaddieTurn) => {
        data.remainingActionPoints = 0
    },
}

const refreshActionPoints = (data: SquaddieTurn) => {
    data.remainingActionPoints = DEFAULT_ACTION_POINTS_PER_TURN
}
