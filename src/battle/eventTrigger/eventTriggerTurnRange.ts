export interface EventTriggerTurnRange {
    exactTurn?: number
    minimumTurns?: number
    maximumTurns?: number
}

export const EventTriggerTurnRangeService = {
    isValidTrigger: (eventTrigger: EventTriggerTurnRange): boolean =>
        eventTrigger &&
        (eventTrigger.exactTurn != undefined ||
            eventTrigger.minimumTurns != undefined ||
            eventTrigger.maximumTurns != undefined),
    isAfterMinimumTurnsPassed: ({
        trigger,
        turnCount,
    }: {
        trigger: EventTriggerTurnRange
        turnCount: number
    }): boolean =>
        trigger.minimumTurns == undefined || turnCount >= trigger.minimumTurns,
    isBeforeMaximumTurnsPassed: ({
        trigger,
        turnCount,
    }: {
        trigger: EventTriggerTurnRange
        turnCount: number
    }): boolean =>
        trigger.maximumTurns == undefined || turnCount <= trigger.maximumTurns,
    isOnExactTurn: ({
        trigger,
        turnCount,
    }: {
        trigger: EventTriggerTurnRange
        turnCount: number
    }): boolean =>
        trigger.exactTurn == undefined || trigger.exactTurn == turnCount,
}
