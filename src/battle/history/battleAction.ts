import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"
import { isValidValue } from "../../utils/validityCheck"
import { BattleActionSquaddieChange } from "./battleActionSquaddieChange"

export interface BattleActionActor {
    battleSquaddieId: string
}

export interface BattleActionId {
    id?: string
    isMovement?: boolean
    isEndTurn?: boolean
}

export interface BattleActionEffect {
    movement?: {
        startLocation: HexCoordinate
        endLocation: HexCoordinate
    }
    squaddie?: BattleActionSquaddieChange[]
    endTurn?: boolean
}

export interface BattleAction {
    actor: BattleActionActor
    action: BattleActionId
    effect: BattleActionEffect
}

export const BattleActionService = {
    new: ({
        actor,
        action,
        effect,
    }: {
        actor: BattleActionActor
        action: BattleActionId
        effect: BattleActionEffect
    }): BattleAction => {
        return sanitize({
            actor,
            action,
            effect,
        })
    },
}

const sanitize = (battleAction: BattleAction): BattleAction => {
    if (
        !isValidValue(battleAction.action.id) &&
        !isValidValue(battleAction.action.isMovement) &&
        !isValidValue(battleAction.action.isEndTurn)
    ) {
        throw new Error(
            `BattleAction cannot sanitize, action must set one of: id, isMovement, isEndTurn`
        )
    }

    if (
        !isValidValue(battleAction.effect.movement) &&
        !isValidValue(battleAction.effect.squaddie) &&
        !isValidValue(battleAction.effect.endTurn)
    ) {
        throw new Error(
            `BattleAction cannot sanitize, effect must set one of: movement, squaddie, endTurn`
        )
    }

    return battleAction
}

export interface BattleActionQueue {
    actions: BattleAction[]
}

export const BattleActionQueueService = {
    new: ({}): BattleActionQueue => {
        return {
            actions: [],
        }
    },
    isEmpty: (queue: BattleActionQueue): boolean => {
        return queue?.actions.length === 0
    },
    add: (queue: BattleActionQueue, battleAction: BattleAction) => {
        queue.actions.unshift(battleAction)
    },
    peek: (queue: BattleActionQueue): BattleAction | undefined => {
        return queue?.actions.length > 0 ? queue.actions[0] : undefined
    },
    dequeue: (queue: BattleActionQueue): BattleAction | undefined => {
        if (!isValidValue(queue?.actions)) {
            return undefined
        }

        return queue.actions.shift()
    },
    length: (queue: BattleActionQueue): number => {
        return isValidValue(queue) ? queue.actions.length : 0
    },
    deleteAll: (queue: BattleActionQueue) => {
        queue.actions = []
    },
}
