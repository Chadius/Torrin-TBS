export interface EventTriggerTurnRange {
    exactTurn?: number
    minimumTurns?: number
    maximumTurns?: number
}

export const EventTriggerTurnRangeService = {
    new: ({
        exactTurn,
        minimumTurns,
        maximumTurns,
    }: {
        exactTurn?: number
        minimumTurns?: number
        maximumTurns?: number
    }): EventTriggerTurnRange => {
        return {
            exactTurn,
            minimumTurns,
            maximumTurns,
        }
    },
    shouldTrigger: ({
        eventTrigger,
        turnCount,
        ignoreTurn0,
    }: {
        eventTrigger: EventTriggerTurnRange
        turnCount?: number
        ignoreTurn0?: boolean
    }): boolean =>
        isValidTrigger(eventTrigger) &&
        isAfterMinimumTurnsPassed({ trigger: eventTrigger, turnCount }) &&
        isBeforeMaximumTurnsPassed({ trigger: eventTrigger, turnCount }) &&
        isOnExactTurn({ trigger: eventTrigger, turnCount, ignoreTurn0 }),
    isValidTrigger: (eventTrigger: EventTriggerTurnRange): boolean =>
        isValidTrigger(eventTrigger),
    isAfterMinimumTurnsPassed: ({
        trigger,
        turnCount,
    }: {
        trigger: EventTriggerTurnRange
        turnCount: number
    }): boolean => isAfterMinimumTurnsPassed({ trigger, turnCount }),
    isBeforeMaximumTurnsPassed: ({
        trigger,
        turnCount,
    }: {
        trigger: EventTriggerTurnRange
        turnCount: number
    }): boolean => isBeforeMaximumTurnsPassed({ trigger, turnCount }),
    isOnExactTurn: ({
        trigger,
        turnCount,
        ignoreTurn0,
    }: {
        trigger: EventTriggerTurnRange
        turnCount: number
        ignoreTurn0?: boolean
    }): boolean => isOnExactTurn({ trigger, turnCount, ignoreTurn0 }),
}

const isValidTrigger = (eventTrigger: EventTriggerTurnRange): boolean =>
    eventTrigger &&
    (eventTrigger.exactTurn != undefined ||
        eventTrigger.minimumTurns != undefined ||
        eventTrigger.maximumTurns != undefined)
const isAfterMinimumTurnsPassed = ({
    trigger,
    turnCount,
}: {
    trigger: EventTriggerTurnRange
    turnCount?: number
}): boolean =>
    turnCount != undefined &&
    (trigger.minimumTurns == undefined || turnCount >= trigger.minimumTurns)
const isBeforeMaximumTurnsPassed = ({
    trigger,
    turnCount,
}: {
    trigger: EventTriggerTurnRange
    turnCount?: number
}): boolean =>
    turnCount != undefined &&
    (trigger.maximumTurns == undefined || turnCount <= trigger.maximumTurns)
const isOnExactTurn = ({
    trigger,
    turnCount,
    ignoreTurn0,
}: {
    trigger: EventTriggerTurnRange
    turnCount?: number
    ignoreTurn0?: boolean
}): boolean =>
    turnCount != undefined &&
    (trigger.exactTurn == undefined ||
        (trigger.exactTurn == turnCount && (!ignoreTurn0 || turnCount != 0)))
