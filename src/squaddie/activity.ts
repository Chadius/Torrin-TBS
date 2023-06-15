import {assertsInteger} from "../utils/mathAssert";
import {TraitStatusStorage} from "../trait/traitStatusStorage";

export type ActivityRange = {
    minimumRange: number | undefined;
    maximumRange: number | undefined;
}

type Options = ActivityRange & {
    actionsToSpend: number;
}

export class SquaddieActivity {
    private _name: string;
    private _id: string;
    private _minimumRange: number;
    private _maximumRange: number;
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
        if (options.actionsToSpend !== undefined) {
            assertsInteger(options.actionsToSpend);
        }

        this._minimumRange = options.minimumRange;
        this._maximumRange = options.maximumRange;

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
        return this._minimumRange;
    }
    get maximumRange(): number {
        return this._maximumRange;
    }
}
