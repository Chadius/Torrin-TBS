import {BattleEvent} from "./battleEvent";

export type RecordingOptions = {}

export class Recording {
    history: BattleEvent[];
    constructor(options: Partial<RecordingOptions>) {
        this.history = [];
    }

    addEvent(battleEvent: BattleEvent) {
        this.history.push(battleEvent);
    }

    getHistory(): BattleEvent[] {
        return [...this.history];
    }
}
