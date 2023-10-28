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

export class RecordingDELETEME {
    private readonly _history: BattleEvent[];

    constructor(options: {}) {
        this._history = [];
    }

    get mostRecentEvent(): BattleEvent {
        if (this._history.length === 0) {
            return undefined;
        }

        return BattleEventHandler.clone(this.history[this._history.length - 1]);
    }

    get history(): BattleEvent[] {
        return [...this._history];
    }

    addEvent(battleEvent: BattleEvent) {
        this._history.push(battleEvent);
    }
}
