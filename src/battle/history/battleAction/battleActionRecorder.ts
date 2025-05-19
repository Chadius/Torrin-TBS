import { BattleAction } from "./battleAction"
import {
    BattleActionsDuringTurn,
    BattleActionsDuringTurnService,
} from "./battleActionsDuringTurn"
import {
    BattleActionQueue,
    BattleActionQueueService,
} from "./battleActionQueue"

export interface BattleActionRecorder {
    readyToAnimateQueue: BattleActionQueue
    actionsAlreadyAnimatedThisTurn: BattleActionsDuringTurn
    previousTurns: BattleActionsDuringTurn[]
}

export const BattleActionRecorderService = {
    new: (): BattleActionRecorder => newBattleActionRecorder(),
    isAnimationQueueEmpty: (
        battleActionRecorder: BattleActionRecorder
    ): boolean => {
        if (!battleActionRecorder) {
            return true
        }
        return BattleActionQueueService.isEmpty(
            battleActionRecorder.readyToAnimateQueue
        )
    },
    addReadyToAnimateBattleAction: (
        battleActionRecorder: BattleActionRecorder,
        battleAction: BattleAction
    ) => {
        if (!battleActionRecorder) {
            return
        }

        BattleActionQueueService.add(
            battleActionRecorder.readyToAnimateQueue,
            battleAction
        )
    },
    peekAtAnimationQueue: (
        battleActionRecorder: BattleActionRecorder
    ): BattleAction => {
        if (!battleActionRecorder) {
            return undefined
        }

        return BattleActionQueueService.peek(
            battleActionRecorder.readyToAnimateQueue
        )
    },
    addAnimatingBattleActionToAlreadyAnimatedThisTurn: (
        battleActionRecorder: BattleActionRecorder
    ) => {
        if (!battleActionRecorder) {
            return
        }

        const actionThatFinishedAnimating = BattleActionQueueService.peek(
            battleActionRecorder.readyToAnimateQueue
        )
        if (!actionThatFinishedAnimating) {
            return
        }
        BattleActionsDuringTurnService.add(
            battleActionRecorder.actionsAlreadyAnimatedThisTurn,
            actionThatFinishedAnimating
        )
        BattleActionQueueService.dequeue(
            battleActionRecorder.readyToAnimateQueue
        )
    },
    dequeueBattleActionFromReadyToAnimateQueue: (
        battleActionRecorder: BattleActionRecorder
    ) => {
        if (!battleActionRecorder) {
            return
        }

        BattleActionQueueService.dequeue(
            battleActionRecorder.readyToAnimateQueue
        )
    },
    isAlreadyAnimatedQueueEmpty: (
        battleActionRecorder: BattleActionRecorder
    ): boolean => {
        if (!battleActionRecorder) {
            return false
        }

        return BattleActionsDuringTurnService.isEmpty(
            battleActionRecorder.actionsAlreadyAnimatedThisTurn
        )
    },
    peekAtAlreadyAnimatedQueue: (
        battleActionRecorder: BattleActionRecorder
    ): BattleAction => {
        if (!battleActionRecorder) {
            return undefined
        }

        if (
            BattleActionsDuringTurnService.isEmpty(
                battleActionRecorder.actionsAlreadyAnimatedThisTurn
            )
        ) {
            return undefined
        }

        return BattleActionsDuringTurnService.getAll(
            battleActionRecorder.actionsAlreadyAnimatedThisTurn
        )[0]
    },
    turnComplete: (battleActionRecorder: BattleActionRecorder) => {
        if (!battleActionRecorder) {
            return
        }
        if (
            BattleActionsDuringTurnService.isEmpty(
                battleActionRecorder.actionsAlreadyAnimatedThisTurn
            )
        ) {
            return
        }

        battleActionRecorder.previousTurns.push(
            battleActionRecorder.actionsAlreadyAnimatedThisTurn
        )
        battleActionRecorder.readyToAnimateQueue =
            BattleActionQueueService.new()
        battleActionRecorder.actionsAlreadyAnimatedThisTurn =
            BattleActionsDuringTurnService.new()
    },
    getPreviousBattleActionTurns: (
        battleActionRecorder: BattleActionRecorder
    ): BattleActionsDuringTurn[] => {
        if (!battleActionRecorder) {
            return []
        }

        return battleActionRecorder.previousTurns
    },
    mostRecentAnimatedActionThisTurn: (
        battleActionRecorder: BattleActionRecorder
    ): BattleAction => {
        if (!battleActionRecorder) {
            return undefined
        }

        if (
            BattleActionsDuringTurnService.isEmpty(
                battleActionRecorder.actionsAlreadyAnimatedThisTurn
            )
        ) {
            return undefined
        }

        const allActions = BattleActionsDuringTurnService.getAll(
            battleActionRecorder.actionsAlreadyAnimatedThisTurn
        )
        return allActions[allActions.length - 1]
    },
    mostRecentCompletedTurn: (
        battleActionRecorder: BattleActionRecorder
    ): BattleActionsDuringTurn => {
        if (!battleActionRecorder) {
            return undefined
        }

        if (battleActionRecorder.previousTurns.length === 0) {
            return undefined
        }

        return battleActionRecorder.previousTurns[
            battleActionRecorder.previousTurns.length - 1
        ]
    },
    clone: (original: BattleActionRecorder): BattleActionRecorder => {
        const clone = newBattleActionRecorder()
        clone.previousTurns = original.previousTurns
            ? original.previousTurns.map(BattleActionsDuringTurnService.clone)
            : []
        clone.readyToAnimateQueue = original.readyToAnimateQueue
            ? BattleActionQueueService.clone(original.readyToAnimateQueue)
            : original.readyToAnimateQueue
        clone.actionsAlreadyAnimatedThisTurn =
            clone.actionsAlreadyAnimatedThisTurn
                ? BattleActionsDuringTurnService.clone(
                      original.actionsAlreadyAnimatedThisTurn
                  )
                : clone.actionsAlreadyAnimatedThisTurn
        return clone
    },
}

const newBattleActionRecorder = (): BattleActionRecorder => ({
    readyToAnimateQueue: BattleActionQueueService.new(),
    actionsAlreadyAnimatedThisTurn: BattleActionsDuringTurnService.new(),
    previousTurns: [],
})
