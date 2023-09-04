import {assertsInteger} from "../utils/mathAssert";
import {Trait, TraitStatusStorage} from "../trait/traitStatusStorage";
import {TargetingShape} from "../battle/targeting/targetingShapeGenerator";
import {DamageType} from "./squaddieService";

export class ActivityRange {
    constructor(options: {
        minimumRange?: number,
        maximumRange?: number,
        targetingShape?: TargetingShape,
    }) {
        this._minimumRange = options.minimumRange;
        this._maximumRange = options.maximumRange;
        this._targetingShape = options.targetingShape ?? TargetingShape.Snake;
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

export class SquaddieActivity {
    private readonly _name: string;
    private readonly _id: string;
    private _range?: ActivityRange;
    private readonly _actionsToSpend: number;
    private readonly _traits: TraitStatusStorage;
    private readonly _damageDescriptions: { [t in DamageType]?: number };

    constructor(options: {
        name: string;
        id: string;
        traits: TraitStatusStorage;
        actionsToSpend?: number;
        damageDescriptions?: { [t in DamageType]?: number },
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
        this._damageDescriptions = options.damageDescriptions ? {...options.damageDescriptions} : {};
    }

    get isHelpful(): boolean {
        return false;
    }

    get isHindering(): boolean {
        return this.traits.getStatus(Trait.ATTACK);
    }

    get damageDescriptions(): { [t in DamageType]?: number } {
        return this._damageDescriptions;
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

    get targetingShape(): TargetingShape {
        return this._range.targetingShape;
    }
}
