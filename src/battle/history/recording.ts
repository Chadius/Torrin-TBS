import {BattleEvent, BattleEventHandler} from "./battleEvent";

export interface Recording {
    history: BattleEvent[];
}

export const RecordingHandler = {
    mostRecentEvent: (data: Recording): BattleEvent => {
        if (data.history.length === 0) {
            return undefined;
        }

        return BattleEventHandler.clone(data.history[data.history.length - 1]);
    },
    addEvent: (data: Recording, battleEvent: BattleEvent) => {
        data.history.push(battleEvent);
    }
};
