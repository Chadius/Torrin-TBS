export class UIControlSettings {
    get displayMap(): boolean {
        return this._displayMap;
    }

    get scrollCamera(): boolean {
        return this._scrollCamera;
    }

    private _scrollCamera?: boolean;
    private _displayMap?: boolean;

    constructor({scrollCamera, displayMap}: { scrollCamera?: boolean, displayMap?: boolean }) {
        this._scrollCamera = scrollCamera;
        this._displayMap = displayMap;
    }

    public update(other: UIControlSettings) {
        if (other._scrollCamera !== undefined) {
            this._scrollCamera = other._scrollCamera
        }

        if (other._displayMap !== undefined) {
            this._displayMap = other._displayMap
        }
    }
}
