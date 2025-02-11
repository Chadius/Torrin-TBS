export class UIControlSettings {
    displayPlayerHUD: boolean

    constructor({
        scrollCamera,
        displayMap,
        pauseTimer,
        displayPlayerHUD,
    }: {
        scrollCamera?: boolean
        displayMap?: boolean
        pauseTimer?: boolean
        displayPlayerHUD?: boolean
    }) {
        this._letMouseScrollCamera = scrollCamera
        this._displayBattleMap = displayMap
        this._pauseTimer = pauseTimer
        this.displayPlayerHUD = displayPlayerHUD
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

        if (other.displayPlayerHUD !== undefined) {
            this.displayPlayerHUD = other.displayPlayerHUD
        }
    }
}
