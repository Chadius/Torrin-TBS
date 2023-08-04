export class ActivityResult {
    private readonly _damageTaken: number;

    constructor({damageTaken}: { damageTaken?: number }) {
        this._damageTaken = damageTaken ?? 0;
    }

    get damageTaken(): number {
        return this._damageTaken;
    }
}
