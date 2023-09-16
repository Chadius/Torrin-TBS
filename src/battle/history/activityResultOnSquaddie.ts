export class ActivityResultOnSquaddie {
    private readonly _damageTaken: number;
    private readonly _healingReceived: number;

    constructor({damageTaken, healingReceived}: { damageTaken?: number, healingReceived?: number }) {
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
