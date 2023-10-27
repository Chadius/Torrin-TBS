import {assertsInteger} from "../utils/mathAssert";
import {Trait, TraitStatusStorage, TraitStatusStorageData} from "../trait/traitStatusStorage";
import {TargetingShape} from "../battle/targeting/targetingShapeGenerator";
import {DamageType, HealingType} from "./squaddieService";

export class ActionRange {
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

export const SquaddieActionHandler = {
    isHelpful: (data: SquaddieActionData): boolean => {
        const traitStatus: TraitStatusStorage = new TraitStatusStorage({data: data.traits});
        return traitStatus.getStatus(Trait.HEALING);
    },
    isHindering: (data: SquaddieActionData): boolean => {
        const traitStatus: TraitStatusStorage = new TraitStatusStorage({data: data.traits});
        return traitStatus.getStatus(Trait.ATTACK);
    },
};

export interface SquaddieActionData {
    damageDescriptions: { [t in DamageType]?: number };
    healingDescriptions: { Unknown?: number; LostHitPoints?: number };
    name: string;
    id: string;
    traits: TraitStatusStorageData;
    actionPointCost: number;
    minimumRange: number;
    maximumRange: number;
    targetingShape: TargetingShape;
}

export class SquaddieAction implements SquaddieActionData {
    private readonly _name: string;
    private readonly _id: string;
    private _range?: ActionRange;
    private readonly _actionPointCost: number;
    private readonly _traits: TraitStatusStorage;
    private readonly _damageDescriptions: { [t in DamageType]?: number };
    private readonly _healingDescriptions: { [t in HealingType]?: number };

    constructor({
                    actionPointCost,
                    damageDescriptions,
                    healingDescriptions,
                    id,
                    maximumRange,
                    minimumRange,
                    name,
                    traits,
                    data,
                }: {
        name?: string;
        id?: string;
        traits?: TraitStatusStorageData;
        actionPointCost?: number;
        damageDescriptions?: { [t in DamageType]?: number },
        healingDescriptions?: { [t in HealingType]?: number },
        data?: SquaddieActionData,
    } & Partial<ActionRange>) {
        if (data) {
            this._id = data.id;
            this._name = data.name;

            assertsInteger(data.minimumRange);
            assertsInteger(data.maximumRange);
            this._range = new ActionRange({
                minimumRange: data.minimumRange,
                maximumRange: data.maximumRange,
            });

            assertsInteger(data.actionPointCost);
            this._actionPointCost = data.actionPointCost;

            this._damageDescriptions = data.damageDescriptions;
            this._healingDescriptions = data.healingDescriptions;

            this._traits = new TraitStatusStorage({data: data.traits});
            return;
        }

        this._name = name;
        this._id = id;

        if (minimumRange !== undefined) {
            assertsInteger(minimumRange);
        }
        if (maximumRange !== undefined) {
            assertsInteger(maximumRange);
        }
        this._range = new ActionRange({
            minimumRange: minimumRange,
            maximumRange: maximumRange,
        })

        if (actionPointCost !== undefined) {
            assertsInteger(actionPointCost);
        }

        if (actionPointCost) {
            assertsInteger(actionPointCost);
            this._actionPointCost = actionPointCost;
        } else {
            this._actionPointCost = 1;
        }

        this._traits = new TraitStatusStorage({data: traits});
        this._damageDescriptions = damageDescriptions ? {...(damageDescriptions)} : {};
        this._healingDescriptions = healingDescriptions ? {...(healingDescriptions)} : {};
    }

    get isHelpful(): boolean {
        return this.traits.getStatus(Trait.HEALING);
    }

    get isHindering(): boolean {
        return this.traits.getStatus(Trait.ATTACK);
    }

    get damageDescriptions(): { [t in DamageType]?: number } {
        return this._damageDescriptions;
    }

    get healingDescriptions(): { [t in HealingType]?: number } {
        return this._healingDescriptions;
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

    get actionPointCost(): number {
        return this._actionPointCost;
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
