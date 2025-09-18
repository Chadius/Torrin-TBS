import { ActionTemplate } from "../action/template/actionTemplate"
import { BattleSquaddie } from "../battle/battleSquaddie"
import { InBattleAttributesService } from "../battle/stats/inBattleAttributes"
import { SquaddieActionPointsExplanation } from "./squaddieService"
import { EnumLike } from "../utils/enum"

export const DEFAULT_ACTION_POINTS_PER_TURN = 3

export const ActionPerformFailureReason = {
    UNKNOWN: "UNKNOWN",
    TOO_FEW_ACTIONS_REMAINING: "TOO_FEW_ACTIONS_REMAINING",
    NO_ATTRIBUTES_WILL_BE_ADDED: "NO_ATTRIBUTES_WILL_BE_ADDED",
    TOO_MANY_USES_THIS_ROUND: "TOO_MANY_USES_THIS_ROUND",
    STILL_ON_COOLDOWN: "STILL_ON_COOLDOWN",
    NO_TARGETS_IN_RANGE: "NO_TARGETS_IN_RANGE",
    HEAL_HAS_NO_EFFECT: "HEAL_HAS_NO_EFFECT",
} as const satisfies Record<string, string>

export type TActionPerformFailureReason = EnumLike<
    typeof ActionPerformFailureReason
>

export interface SquaddieTurn {
    movementActionPoints: {
        previewedByPlayer: number
        spentButCanBeRefunded: number
        spentAndCannotBeRefunded: number
    }
    actionTemplatePoints: number
    endTurn: boolean
}

export const SquaddieTurnService = {
    new: (): SquaddieTurn => {
        return {
            movementActionPoints: {
                previewedByPlayer: 0,
                spentButCanBeRefunded: 0,
                spentAndCannotBeRefunded: 0,
            },
            actionTemplatePoints: 0,
            endTurn: false,
        }
    },
    spendPreviewedMovementActionPointsToRefundable: ({
        squaddieTurn,
    }: {
        squaddieTurn: SquaddieTurn
    }) => {
        squaddieTurn.movementActionPoints.spentButCanBeRefunded =
            squaddieTurn.movementActionPoints.previewedByPlayer
        squaddieTurn.movementActionPoints.previewedByPlayer = 0
    },
    setSpentMovementActionPointsAsNotRefundable: ({
        squaddieTurn,
        endTurn,
        actionTemplate,
    }: {
        squaddieTurn: SquaddieTurn
        endTurn?: boolean
        actionTemplate?: ActionTemplate
    }) => {
        if (endTurn) {
            squaddieTurn.endTurn = true
            return
        }
        if (actionTemplate) {
            squaddieTurn.actionTemplatePoints +=
                actionTemplate.resourceCost?.actionPoints ?? 0
        }
        squaddieTurn.movementActionPoints.spentAndCannotBeRefunded +=
            squaddieTurn.movementActionPoints.spentButCanBeRefunded
        squaddieTurn.movementActionPoints.spentButCanBeRefunded = 0
    },
    canPerformAction: ({
        actionTemplate,
        battleSquaddie,
    }: {
        battleSquaddie: BattleSquaddie
        actionTemplate: ActionTemplate
    }): {
        canPerform: boolean
        reason: TActionPerformFailureReason
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

        const actionPointsToSpend = getUnSpentActionPoints(
            battleSquaddie.squaddieTurn
        )

        if (
            battleSquaddie.squaddieTurn.endTurn ||
            (actionTemplate.resourceCost &&
                actionPointsToSpend < actionTemplate.resourceCost.actionPoints)
        ) {
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
    beginNewTurn: (data: SquaddieTurn) => {
        refreshActionPoints(data)
    },
    endTurn: (data: SquaddieTurn) => consumeAllActionPointsAtEndOfTurn(data),
    getMovementActionPointsPreviewedByPlayer: (squaddieTurn: SquaddieTurn) =>
        squaddieTurn.movementActionPoints.previewedByPlayer,
    getActionPointsThatCouldBeSpentOnMovement: (squaddieTurn: SquaddieTurn) =>
        getUnSpentActionPoints(squaddieTurn) +
        squaddieTurn.movementActionPoints.spentButCanBeRefunded,
    setMovementActionPointsPreviewedByPlayer: ({
        squaddieTurn,
        actionPoints,
    }: {
        squaddieTurn: SquaddieTurn
        actionPoints: number
    }) => {
        squaddieTurn.movementActionPoints.previewedByPlayer = actionPoints
    },
    getMovementActionPointsSpentAndCannotBeRefunded: (
        squaddieTurn: SquaddieTurn
    ) => squaddieTurn.movementActionPoints.spentAndCannotBeRefunded || 0,
    setMovementActionPointsSpentAndCannotBeRefunded({
        squaddieTurn,
        actionPoints,
    }: {
        squaddieTurn: SquaddieTurn
        actionPoints: number
    }) {
        squaddieTurn.movementActionPoints.spentAndCannotBeRefunded =
            actionPoints
    },
    getMovementActionPointsSpentButCanBeRefunded: (
        squaddieTurn: SquaddieTurn
    ) => squaddieTurn.movementActionPoints.spentButCanBeRefunded || 0,
    setMovementActionPointsSpentButCanBeRefunded({
        squaddieTurn,
        actionPoints,
    }: {
        squaddieTurn: SquaddieTurn
        actionPoints: number
    }) {
        squaddieTurn.movementActionPoints.spentButCanBeRefunded = actionPoints
    },
    getActionPointSpend: (
        squaddieTurn: SquaddieTurn
    ): SquaddieActionPointsExplanation => getActionPointSpend(squaddieTurn),
}

const refreshActionPoints = (squaddieTurn: SquaddieTurn) => {
    squaddieTurn.endTurn = false
    squaddieTurn.actionTemplatePoints = 0
    squaddieTurn.movementActionPoints.spentButCanBeRefunded = 0
    squaddieTurn.movementActionPoints.spentAndCannotBeRefunded = 0
    squaddieTurn.movementActionPoints.previewedByPlayer = 0
}

const consumeAllActionPointsAtEndOfTurn = (squaddieTurn: SquaddieTurn) => {
    squaddieTurn.endTurn = true
    squaddieTurn.movementActionPoints.spentButCanBeRefunded = 0
    squaddieTurn.movementActionPoints.spentAndCannotBeRefunded =
        DEFAULT_ACTION_POINTS_PER_TURN
}

const getUnSpentActionPoints = (squaddieTurn: SquaddieTurn): number =>
    squaddieTurn.endTurn
        ? 0
        : DEFAULT_ACTION_POINTS_PER_TURN -
          squaddieTurn.actionTemplatePoints -
          squaddieTurn.movementActionPoints.spentButCanBeRefunded -
          squaddieTurn.movementActionPoints.spentAndCannotBeRefunded

const getActionPointSpend = (
    squaddieTurn: SquaddieTurn
): SquaddieActionPointsExplanation => {
    return {
        unSpentActionPoints: getUnSpentActionPoints(squaddieTurn),
        movementActionPoints: {
            previewedByPlayer:
                squaddieTurn.movementActionPoints.previewedByPlayer,
            spentAndCannotBeRefunded:
                squaddieTurn.movementActionPoints.spentAndCannotBeRefunded || 0,
            spentButCanBeRefunded:
                squaddieTurn.movementActionPoints.spentButCanBeRefunded || 0,
        },
    }
}
