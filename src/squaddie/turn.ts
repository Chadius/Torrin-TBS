import { ActionTemplate } from "../action/template/actionTemplate"

import { ActionPointCost } from "../battle/history/battleAction/battleAction"
import {
    PlayerConsideredActions,
    PlayerConsideredActionsService,
} from "../battle/battleState/playerConsideredActions"
import { ObjectRepository } from "../battle/objectRepository"
import { BattleSquaddie } from "../battle/battleSquaddie"

export const DEFAULT_ACTION_POINTS_PER_TURN = 3

export enum ActionPerformFailureReason {
    UNKNOWN = "UNKNOWN",
    TOO_FEW_ACTIONS_REMAINING = "TOO_FEW_ACTIONS_REMAINING",
    CAN_PERFORM_BUT_TOO_MANY_CONSIDERED_ACTION_POINTS = "CAN_PERFORM_BUT_TOO_MANY_CONSIDERED_ACTION_POINTS",
    BUFF_HAS_NO_EFFECT = "BUFF_HAS_NO_EFFECT",
    TOO_MANY_USES_THIS_ROUND = "TOO_MANY_USES_THIS_ROUND",
}

export interface SquaddieTurn {
    remainingActionPoints: number
}

export const SquaddieTurnService = {
    new: (): SquaddieTurn => {
        return {
            remainingActionPoints: DEFAULT_ACTION_POINTS_PER_TURN,
        }
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
    canPerformAction: ({
        actionTemplate,
        playerConsideredActions,
        objectRepository,
        battleSquaddie,
    }: {
        battleSquaddie: BattleSquaddie
        actionTemplate: ActionTemplate
        playerConsideredActions?: PlayerConsideredActions
        objectRepository?: ObjectRepository
    }): {
        canPerform: boolean
        reason: ActionPerformFailureReason
    } => {
        const actionPointsToSpend =
            battleSquaddie.squaddieTurn.remainingActionPoints

        let actionPointsAlreadyConsidered = 0
        if (playerConsideredActions?.actionTemplateId !== actionTemplate.id) {
            actionPointsAlreadyConsidered =
                PlayerConsideredActionsService.getExpectedMarkedActionPointsBasedOnPlayerConsideration(
                    {
                        objectRepository,
                        playerConsideredActions,
                        battleSquaddie,
                    }
                )
        }

        if (actionPointsToSpend < actionTemplate.resourceCost.actionPoints) {
            return {
                canPerform: false,
                reason: ActionPerformFailureReason.TOO_FEW_ACTIONS_REMAINING,
            }
        }

        if (
            actionPointsAlreadyConsidered > 0 &&
            actionPointsToSpend <
                actionTemplate.resourceCost.actionPoints +
                    actionPointsAlreadyConsidered
        ) {
            return {
                canPerform: true,
                reason: ActionPerformFailureReason.CAN_PERFORM_BUT_TOO_MANY_CONSIDERED_ACTION_POINTS,
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
