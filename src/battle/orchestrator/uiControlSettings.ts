export class UIControlSettings {
    constructor({
        scrollCamera,
        displayMap,
        pauseTimer,
    }: {
        scrollCamera?: boolean
        displayMap?: boolean
        pauseTimer?: boolean
    }) {
        this._letMouseScrollCamera = scrollCamera
        this._displayBattleMap = displayMap
        this._pauseTimer = pauseTimer
    }

    private _letMouseScrollCamera?: boolean

    get letMouseScrollCamera(): boolean {
        return this._letMouseScrollCamera
    }

    private _displayBattleMap?: boolean

    get displayBattleMap(): boolean {
        return this._displayBattleMap
    }

    private _pauseTimer?: boolean

    get pauseTimer(): boolean {
        return this._pauseTimer
    }

    public update(other: UIControlSettings) {
        if (!other) {
            return
        }

        if (other._letMouseScrollCamera !== undefined) {
            this._letMouseScrollCamera = other._letMouseScrollCamera
        }

        if (other._displayBattleMap !== undefined) {
            this._displayBattleMap = other._displayBattleMap
        }

        if (other._pauseTimer !== undefined) {
            this._pauseTimer = other._pauseTimer
        }
    }
}
