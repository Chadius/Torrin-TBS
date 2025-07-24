import { BattleCompletionStatus } from "../orchestrator/missionObjectivesAndCutscenes"

export interface EventBattleProgress {
    battleCompletionStatus: BattleCompletionStatus
}

export const EventBattleProgressService = {
    new: ({
        battleCompletionStatus,
    }: {
        battleCompletionStatus: BattleCompletionStatus
    }): EventBattleProgress =>
        sanitize({
            battleCompletionStatus,
        }),
    sanitize: (event: EventBattleProgress): EventBattleProgress =>
        sanitize(event),
    isValid: (event: EventBattleProgress): boolean => isValid(event),
    shouldTrigger: ({
        eventTrigger,
        battleCompletionStatus,
    }: {
        eventTrigger: EventBattleProgress
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

const isValid = (event: EventBattleProgress): boolean =>
    !!event?.battleCompletionStatus

const sanitize = (event: EventBattleProgress): EventBattleProgress => {
    if (!event.battleCompletionStatus) {
        throw new Error("EventBattleProgress requires a BattleCompletionStatus")
    }
    return event
}
