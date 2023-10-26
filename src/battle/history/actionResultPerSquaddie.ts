export interface ActionResultPerSquaddieData {
    damageTaken: number;
    healingReceived: number;
}

export class ActionResultPerSquaddie implements ActionResultPerSquaddieData {
    private readonly _damageTaken: number;
    private readonly _healingReceived: number;

    constructor({damageTaken, healingReceived, data}: {
        damageTaken?: number,
        healingReceived?: number,
        data?: ActionResultPerSquaddieData
    }) {
        if (data) {
            this._damageTaken = data.damageTaken;
            this._healingReceived = data.healingReceived;
            return;
        }

        this._damageTaken = damageTaken || 0;
        this._healingReceived = healingReceived || 0;
    }

    get damageTaken(): number {
        return this._damageTaken;
    }

    get healingReceived(): number {
        return this._healingReceived;
    }
}
