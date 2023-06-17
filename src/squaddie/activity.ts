import {assertsInteger} from "../utils/mathAssert";
import {TraitStatusStorage} from "../trait/traitStatusStorage";

export class ActivityRange {
    private _minimumRange: number | undefined;
    private _maximumRange: number | undefined;

    constructor(options: {
        minimumRange?: number,
        maximumRange?: number,
    }) {
        this._minimumRange = options.minimumRange;
        this._maximumRange = options.maximumRange;
    }

    get maximumRange(): number | undefined {
        return this._maximumRange;
    }

    set maximumRange(value: number | undefined) {
        this._maximumRange = value;
    }

    get minimumRange(): number | undefined {
        return this._minimumRange;
    }

    set minimumRange(value: number | undefined) {
        this._minimumRange = value;
    }
}

export class SquaddieActivity {
    private _name: string;
    private _id: string;
    private _range?: ActivityRange;
    private _actionsToSpend: number;
    private _traits: TraitStatusStorage;

    constructor(options: {
        name: string;
        id: string;
        traits: TraitStatusStorage;
        actionsToSpend?: number;
    } & Partial<ActivityRange>) {
        this._name = options.name;
        this._id = options.id;

        if (options.minimumRange !== undefined) {
            assertsInteger(options.minimumRange);
        }
        if (options.maximumRange !== undefined) {
            assertsInteger(options.maximumRange);
        }
        this._range = new ActivityRange({
            minimumRange: options.minimumRange,
            maximumRange: options.maximumRange,
        })

        if (options.actionsToSpend !== undefined) {
            assertsInteger(options.actionsToSpend);
        }

        if (options.actionsToSpend) {
            assertsInteger(options.actionsToSpend);
            this._actionsToSpend = options.actionsToSpend;
        } else {
            this._actionsToSpend = 1;
        }

        this._traits = options.traits;
    }

    get name(): string {
        return this._name;
    }

    get id(): string {
        return this._id;
    }

    get traits(): TraitStatusStorage {
        return this._traits;
    }

    get actionsToSpend(): number {
        return this._actionsToSpend;
    }

    get minimumRange(): number {
        return this._range.minimumRange;
    }

    get maximumRange(): number {
        return this._range.maximumRange;
    }
}
