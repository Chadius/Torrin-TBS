import {BattleEvent} from "./battleEvent";

export class Recording {
    private readonly _history: BattleEvent[];

    constructor(options: {}) {
        this._history = [];
    }

    addEvent(battleEvent: BattleEvent) {
        this._history.push(battleEvent);
    }

    get history(): BattleEvent[] {
        return [...this._history];
    }
}
