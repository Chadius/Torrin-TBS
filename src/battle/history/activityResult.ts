export class ActivityResult {
    get damageTaken(): number {
        return this._damageTaken;
    }

    private readonly _damageTaken: number;

    constructor({damageTaken}: { damageTaken?: number }) {
        this._damageTaken = damageTaken ?? 0;
    }
}
