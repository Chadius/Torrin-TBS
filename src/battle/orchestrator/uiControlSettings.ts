export class UIControlSettings {
    get displayBattleMap(): boolean {
        return this._displayBattleMap;
    }

    get letMouseScrollCamera(): boolean {
        return this._letMouseScrollCamera;
    }

    private _letMouseScrollCamera?: boolean;
    private _displayBattleMap?: boolean;

    constructor({scrollCamera, displayMap}: { scrollCamera?: boolean, displayMap?: boolean }) {
        this._letMouseScrollCamera = scrollCamera;
        this._displayBattleMap = displayMap;
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
