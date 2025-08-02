import { BattleCompletionStatus } from "../../orchestrator/missionObjectivesAndCutscenes"

export interface EventTriggerBattleCompletionStatus {
    battleCompletionStatus: BattleCompletionStatus
}

export const EventTriggerBattleCompletionStatusService = {
    new: ({
        battleCompletionStatus,
    }: {
        battleCompletionStatus: BattleCompletionStatus
    }): EventTriggerBattleCompletionStatus =>
        sanitize({
            battleCompletionStatus,
        }),
    sanitize: (
        event: EventTriggerBattleCompletionStatus
    ): EventTriggerBattleCompletionStatus => sanitize(event),
    isValid: (event: EventTriggerBattleCompletionStatus): boolean =>
        isValid(event),
    shouldTrigger: ({
        eventTrigger,
        battleCompletionStatus,
    }: {
        eventTrigger: EventTriggerBattleCompletionStatus
        battleCompletionStatus: BattleCompletionStatus
    }): boolean => {
        switch (eventTrigger.battleCompletionStatus) {
            case BattleCompletionStatus.VICTORY:
                return battleCompletionStatus == BattleCompletionStatus.VICTORY
            case BattleCompletionStatus.DEFEAT:
                return battleCompletionStatus == BattleCompletionStatus.DEFEAT
        }
        return false
    },
}

const isValid = (event: EventTriggerBattleCompletionStatus): boolean =>
    !!event?.battleCompletionStatus

const sanitize = (
    event: EventTriggerBattleCompletionStatus
): EventTriggerBattleCompletionStatus => {
    if (!event.battleCompletionStatus) {
        throw new Error("EventBattleProgress requires a BattleCompletionStatus")
    }
    return event
}
