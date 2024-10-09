import { BattleEvent, BattleEventService } from "./battleEvent"
// TODO Chopping block!
export interface Recording {
    history: BattleEvent[]
}

export const RecordingService = {
    mostRecentEvent: (data: Recording): BattleEvent => {
        if (data.history.length === 0) {
            return undefined
        }

        return BattleEventService.clone(data.history[data.history.length - 1])
    },
    addEvent: (data: Recording, battleEvent: BattleEvent) => {
        data.history.push(battleEvent)
    },
}
