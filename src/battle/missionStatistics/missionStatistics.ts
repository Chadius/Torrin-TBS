export class MissionStatistics {
    get healingReceivedByPlayerTeam(): number {
        return this._healingReceivedByPlayerTeam;
    }

    get damageDealtByPlayerTeam(): number {
        return this._damageDealtByPlayerTeam;
    }

    get damageReceivedByPlayerTeam(): number {
        return this._damageReceivedByPlayerTeam;
    }

    get timeElapsedInMilliseconds(): number {
        return this._timeElapsedInMilliseconds;
    }

    private _timeElapsedInMilliseconds: number;
    private _damageDealtByPlayerTeam: number;
    private _damageReceivedByPlayerTeam: number;
    private _healingReceivedByPlayerTeam: number;

    constructor({}:{}) {
        this.reset();
    }


    public reset() {
        this._timeElapsedInMilliseconds = undefined;
        this._damageDealtByPlayerTeam = undefined;
        this._damageReceivedByPlayerTeam = undefined;
        this._healingReceivedByPlayerTeam = undefined;
    }

    public startRecording() {
        this._timeElapsedInMilliseconds = this._timeElapsedInMilliseconds || Date.now();
        this._damageDealtByPlayerTeam = this._damageDealtByPlayerTeam || 0;
        this._damageReceivedByPlayerTeam = this._damageReceivedByPlayerTeam || 0;
        this._healingReceivedByPlayerTeam = this._healingReceivedByPlayerTeam || 0;
    }

    public updateTimeElapsed() {
        this._timeElapsedInMilliseconds += Date.now() - this._timeElapsedInMilliseconds;
    }

    public addDamageDealtByPlayerTeam(damage: number) {
        this._damageDealtByPlayerTeam += damage;
    }

    public addDamageReceivedByPlayerTeam(damage: number) {
        this._damageReceivedByPlayerTeam += damage;
    }

    public addHealingReceivedByPlayerTeam(damage: number) {
        this._healingReceivedByPlayerTeam += damage;
    }
}
