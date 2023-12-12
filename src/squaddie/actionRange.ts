import {TargetingShape} from "../battle/targeting/targetingShapeGenerator";

export class ActionRange {
    constructor(options: {
        minimumRange?: number,
        maximumRange?: number,
        targetingShape?: TargetingShape,
    }) {
        this._minimumRange = options.minimumRange;
        this._maximumRange = options.maximumRange;
        this._targetingShape = options.targetingShape ?? TargetingShape.SNAKE;
    }

    private _minimumRange: number | undefined;

    get minimumRange(): number | undefined {
        return this._minimumRange;
    }

    set minimumRange(value: number | undefined) {
        this._minimumRange = value;
    }

    private _maximumRange: number | undefined;

    get maximumRange(): number | undefined {
        return this._maximumRange;
    }

    set maximumRange(value: number | undefined) {
        this._maximumRange = value;
    }

    private _targetingShape: TargetingShape;

    get targetingShape(): TargetingShape {
        return this._targetingShape;
    }
}
