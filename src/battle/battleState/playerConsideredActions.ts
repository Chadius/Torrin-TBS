import { MovementDecision } from "../playerSelectionService/playerSelectionContext"

export interface PlayerConsideredActions {
    actionTemplateId?: string
    movement?: MovementDecision
    endTurn?: boolean
    markedActionPoints?: number
}

export const PlayerConsideredActionsService = {
    new: (): PlayerConsideredActions => ({
        actionTemplateId: undefined,
        movement: undefined,
        endTurn: undefined,
        markedActionPoints: undefined,
    }),
}
