import {BattleEvent, CloneBattleEvent} from "./battleEvent";

export class Recording {
    private readonly _history: BattleEvent[];

    constructor(options: {}) {
        this._history = [];
    }

    get mostRecentEvent(): BattleEvent {
        if (this._history.length === 0) {
            return undefined;
        }

        return CloneBattleEvent(this.history[this._history.length - 1]);
    }

    get history(): BattleEvent[] {
        return [...this._history];
    }

    addEvent(battleEvent: BattleEvent) {
        this._history.push(battleEvent);
    }
}
