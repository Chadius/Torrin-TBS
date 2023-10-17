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

    constructor({
                    timeElapsedInMilliseconds
    }:{
        timeElapsedInMilliseconds?: number
    }) {
        this.reset();
        this._timeElapsedInMilliseconds = timeElapsedInMilliseconds;
    }

    public reset() {
        this._timeElapsedInMilliseconds = undefined;
        this._damageDealtByPlayerTeam = undefined;
        this._damageReceivedByPlayerTeam = undefined;
        this._healingReceivedByPlayerTeam = undefined;
    }

    get hasStarted() {
        return this._timeElapsedInMilliseconds != undefined;
    }

    public startRecording() {
        this._timeElapsedInMilliseconds = this._timeElapsedInMilliseconds || 0;
        this._damageDealtByPlayerTeam = this._damageDealtByPlayerTeam || 0;
        this._damageReceivedByPlayerTeam = this._damageReceivedByPlayerTeam || 0;
        this._healingReceivedByPlayerTeam = this._healingReceivedByPlayerTeam || 0;
    }

    public addTimeElapsed(milliseconds: number) {
        this._timeElapsedInMilliseconds += milliseconds;
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
