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
    }: {
        eventTrigger: EventTriggerTurnRange
        turnCount: number
    }): boolean =>
        isValidTrigger(eventTrigger) &&
        isAfterMinimumTurnsPassed({ trigger: eventTrigger, turnCount }) &&
        isBeforeMaximumTurnsPassed({ trigger: eventTrigger, turnCount }) &&
        isOnExactTurn({ trigger: eventTrigger, turnCount }),
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
    }: {
        trigger: EventTriggerTurnRange
        turnCount: number
    }): boolean => isOnExactTurn({ trigger, turnCount }),
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
    turnCount: number
}): boolean =>
    trigger.minimumTurns == undefined || turnCount >= trigger.minimumTurns
const isBeforeMaximumTurnsPassed = ({
    trigger,
    turnCount,
}: {
    trigger: EventTriggerTurnRange
    turnCount: number
}): boolean =>
    trigger.maximumTurns == undefined || turnCount <= trigger.maximumTurns
const isOnExactTurn = ({
    trigger,
    turnCount,
}: {
    trigger: EventTriggerTurnRange
    turnCount: number
}): boolean => trigger.exactTurn == undefined || trigger.exactTurn == turnCount
