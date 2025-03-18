import { MovementDecision } from "../playerSelectionService/playerSelectionContext"
import { BattleSquaddie } from "../battleSquaddie"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { SquaddieTurnService } from "../../squaddie/turn"

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
    getExpectedMarkedActionPointsBasedOnPlayerConsideration: ({
        objectRepository,
        playerConsideredActions,
        battleSquaddie,
    }: {
        objectRepository: ObjectRepository
        playerConsideredActions: PlayerConsideredActions
        battleSquaddie: BattleSquaddie
    }): number => {
        switch (true) {
            case !!playerConsideredActions?.movement:
                return playerConsideredActions.movement.actionPointCost
            case !!playerConsideredActions?.endTurn:
                return SquaddieTurnService.getUnallocatedActionPoints(
                    battleSquaddie.squaddieTurn
                )
            case !!playerConsideredActions?.actionTemplateId:
                return ObjectRepositoryService.getActionTemplateById(
                    objectRepository,
                    playerConsideredActions.actionTemplateId
                ).resourceCost.actionPoints
            default:
                return 0
        }
    },
}
