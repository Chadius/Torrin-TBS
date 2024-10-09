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
    new: (): BattleActionRecorder => {
        return {
            readyToAnimateQueue: BattleActionQueueService.new(),
            actionsAlreadyAnimatedThisTurn:
                BattleActionsDuringTurnService.new(),
            previousTurns: [],
        }
    },
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
    battleActionFinishedAnimating: (
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
}
