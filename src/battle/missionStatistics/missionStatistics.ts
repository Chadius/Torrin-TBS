export class MissionStatistics {
    constructor({
                    timeElapsedInMilliseconds,
                    damageDealtByPlayerTeam,
                    damageTakenByPlayerTeam,
                    healingReceivedByPlayerTeam,
                }: {
        timeElapsedInMilliseconds?: number,
        damageDealtByPlayerTeam?: number,
        damageTakenByPlayerTeam?: number,
        healingReceivedByPlayerTeam?: number,
    }) {
        this.reset();
        this._timeElapsedInMilliseconds = timeElapsedInMilliseconds;
        this._damageDealtByPlayerTeam = damageDealtByPlayerTeam;
        this._damageTakenByPlayerTeam = damageTakenByPlayerTeam;
        this._healingReceivedByPlayerTeam = healingReceivedByPlayerTeam;
    }

    private _timeElapsedInMilliseconds: number;

    get timeElapsedInMilliseconds(): number {
        return this._timeElapsedInMilliseconds;
    }

    private _damageDealtByPlayerTeam: number;

    get damageDealtByPlayerTeam(): number {
        return this._damageDealtByPlayerTeam;
    }

    private _damageTakenByPlayerTeam: number;

    get damageTakenByPlayerTeam(): number {
        return this._damageTakenByPlayerTeam;
    }

    private _healingReceivedByPlayerTeam: number;

    get healingReceivedByPlayerTeam(): number {
        return this._healingReceivedByPlayerTeam;
    }

    get hasStarted() {
        return this._timeElapsedInMilliseconds != undefined;
    }

    public reset() {
        this._timeElapsedInMilliseconds = undefined;
        this._damageDealtByPlayerTeam = undefined;
        this._damageTakenByPlayerTeam = undefined;
        this._healingReceivedByPlayerTeam = undefined;
    }

    public startRecording() {
        this._timeElapsedInMilliseconds = this._timeElapsedInMilliseconds || 0;
        this._damageDealtByPlayerTeam = this._damageDealtByPlayerTeam || 0;
        this._damageTakenByPlayerTeam = this._damageTakenByPlayerTeam || 0;
        this._healingReceivedByPlayerTeam = this._healingReceivedByPlayerTeam || 0;
    }

    public addTimeElapsed(milliseconds: number) {
        this._timeElapsedInMilliseconds += milliseconds;
    }

    public addDamageDealtByPlayerTeam(damage: number) {
        this._damageDealtByPlayerTeam += damage;
    }

    public adddamageTakenByPlayerTeam(damage: number) {
        this._damageTakenByPlayerTeam += damage;
    }

    public addHealingReceivedByPlayerTeam(healing: number) {
        this._healingReceivedByPlayerTeam += healing;
    }
}
