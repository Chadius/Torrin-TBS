import { isValidValue } from "../../../utils/objectValidityCheck"
import { BattleAction, BattleActionService } from "./battleAction"

export interface BattleActionQueue {
    actions: BattleAction[]
}

export const BattleActionQueueService = {
    new: (): BattleActionQueue => newBattleActionQueue({}),
    isEmpty: (queue: BattleActionQueue): boolean => {
        return queue?.actions.length === 0
    },
    add: (queue: BattleActionQueue, battleAction: BattleAction) => {
        queue.actions.push(battleAction)
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
    clone: (original: BattleActionQueue): BattleActionQueue =>
        newBattleActionQueue({ actions: original.actions }),
}

const newBattleActionQueue = ({
    actions,
}: {
    actions?: BattleAction[]
}): BattleActionQueue => ({
    actions: actions ? actions.map(BattleActionService.clone) : [],
})
