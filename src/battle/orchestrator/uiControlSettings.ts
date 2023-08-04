export class UIControlSettings {
    constructor({scrollCamera, displayMap}: { scrollCamera?: boolean, displayMap?: boolean }) {
        this._letMouseScrollCamera = scrollCamera;
        this._displayBattleMap = displayMap;
    }

    private _letMouseScrollCamera?: boolean;

    get letMouseScrollCamera(): boolean {
        return this._letMouseScrollCamera;
    }

    private _displayBattleMap?: boolean;

    get displayBattleMap(): boolean {
        return this._displayBattleMap;
    }

    public update(other: UIControlSettings) {
        if (other._letMouseScrollCamera !== undefined) {
            this._letMouseScrollCamera = other._letMouseScrollCamera
        }

        if (other._displayBattleMap !== undefined) {
            this._displayBattleMap = other._displayBattleMap
        }
    }
}
