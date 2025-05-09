import { ActionTemplate } from "../action/template/actionTemplate"
import {
    PlayerConsideredActions,
    PlayerConsideredActionsService,
} from "../battle/battleState/playerConsideredActions"
import { ObjectRepository } from "../battle/objectRepository"
import { BattleSquaddie } from "../battle/battleSquaddie"
import { InBattleAttributesService } from "../battle/stats/inBattleAttributes"

export const DEFAULT_ACTION_POINTS_PER_TURN = 3

export enum ActionPerformFailureReason {
    UNKNOWN = "UNKNOWN",
    TOO_FEW_ACTIONS_REMAINING = "TOO_FEW_ACTIONS_REMAINING",
    CAN_PERFORM_BUT_TOO_MANY_CONSIDERED_ACTION_POINTS = "CAN_PERFORM_BUT_TOO_MANY_CONSIDERED_ACTION_POINTS",
    NO_ATTRIBUTES_WILL_BE_ADDED = "NO_ATTRIBUTES_WILL_BE_ADDED",
    TOO_MANY_USES_THIS_ROUND = "TOO_MANY_USES_THIS_ROUND",
    STILL_ON_COOLDOWN = "STILL_ON_COOLDOWN",
    NO_TARGETS_IN_RANGE = "NO_TARGETS_IN_RANGE",
    HEAL_HAS_NO_EFFECT = "HEAL_HAS_NO_EFFECT",
}

export interface SquaddieTurn {
    movementActionPoints: number
    unallocatedActionPoints: number
}

export const SquaddieTurnService = {
    new: (): SquaddieTurn => {
        return {
            movementActionPoints: 0,
            unallocatedActionPoints: DEFAULT_ACTION_POINTS_PER_TURN,
        }
    },
    spendActionPointsAndReservedPoints: ({
        data,
        endTurn,
        actionTemplate,
    }: {
        data: SquaddieTurn
        endTurn?: boolean
        actionTemplate?: ActionTemplate
    }) => {
        if (endTurn) {
            consumeAllActionPointsAtEndOfTurn(data)
            return
        }
        if (actionTemplate) {
            data.unallocatedActionPoints =
                data.unallocatedActionPoints -
                actionTemplate.resourceCost.actionPoints
        }
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
        if (
            InBattleAttributesService.isActionInCooldown({
                inBattleAttributes: battleSquaddie.inBattleAttributes,
                actionTemplateId: actionTemplate.id,
            })
        ) {
            return {
                canPerform: false,
                reason: ActionPerformFailureReason.STILL_ON_COOLDOWN,
            }
        }

        const actionPointsToSpend =
            battleSquaddie.squaddieTurn.unallocatedActionPoints

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
    beginNewTurn: (data: SquaddieTurn) => {
        refreshActionPoints(data)
    },
    refreshActionPoints: (data: SquaddieTurn) => {
        refreshActionPoints(data)
    },
    hasActionPointsRemaining: (data: SquaddieTurn): boolean => {
        return data.unallocatedActionPoints > 0
    },
    endTurn: (data: SquaddieTurn) => consumeAllActionPointsAtEndOfTurn(data),
    getActionPointsReservedForMovement: (squaddieTurn: SquaddieTurn) =>
        squaddieTurn.movementActionPoints,
    getUnallocatedActionPoints: (squaddieTurn: SquaddieTurn) =>
        squaddieTurn.unallocatedActionPoints,
    spendActionPointsForMovement: ({
        squaddieTurn,
        actionPoints,
    }: {
        squaddieTurn: SquaddieTurn
        actionPoints: number
    }) => {
        squaddieTurn.unallocatedActionPoints =
            squaddieTurn.unallocatedActionPoints - actionPoints
        squaddieTurn.movementActionPoints = actionPoints
    },
}

const refreshActionPoints = (data: SquaddieTurn) => {
    data.unallocatedActionPoints = DEFAULT_ACTION_POINTS_PER_TURN
}

const consumeAllActionPointsAtEndOfTurn = (data: SquaddieTurn) => {
    data.unallocatedActionPoints = 0
}
