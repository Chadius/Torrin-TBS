import {assertsInteger} from "../utils/mathAssert";
import {Trait, TraitStatusStorageHelper} from "../trait/traitStatusStorage";
import {TargetingShape} from "../battle/targeting/targetingShapeGenerator";
import {DamageType, HealingType} from "./squaddieService";
import {ActionRange} from "./actionRange";
import {isValidValue} from "../utils/validityCheck";

export interface SquaddieSquaddieAction {
    damageDescriptions: { [t in DamageType]?: number };
    healingDescriptions: { [t in HealingType]?: number };
    name: string;
    id: string;
    traits: {
        booleanTraits: { [key in Trait]?: boolean };
    };
    actionPointCost: number;
    minimumRange: number;
    maximumRange: number;
    targetingShape: TargetingShape;
}

export const SquaddieSquaddieActionService = {
    new: ({
              actionPointCost,
              damageDescriptions,
              healingDescriptions,
              id,
              maximumRange,
              minimumRange,
              name,
              traits,
              targetingShape,
          }: {
        name?: string;
        id?: string;
        traits?: {
            booleanTraits: { [key in Trait]?: boolean };
        };
        actionPointCost?: number;
        damageDescriptions?: { [t in DamageType]?: number },
        healingDescriptions?: { [t in HealingType]?: number },
        targetingShape?: TargetingShape,
    } & Partial<ActionRange>): SquaddieSquaddieAction => {
        if (minimumRange !== undefined) {
            assertsInteger(minimumRange);
        }
        if (maximumRange !== undefined) {
            assertsInteger(maximumRange);
        }
        if (actionPointCost !== undefined) {
            assertsInteger(actionPointCost);
        }
        if (actionPointCost) {
            assertsInteger(actionPointCost);
        }

        const data = {
            name: name,
            id: id,
            minimumRange: minimumRange ? minimumRange : 0,
            maximumRange: maximumRange ? maximumRange : 0,
            actionPointCost: actionPointCost,
            traits: traits,
            damageDescriptions: damageDescriptions,
            healingDescriptions: healingDescriptions,
            targetingShape: targetingShape,
        };

        sanitize(data);
        return data;
    },
    isHelpful: (data: SquaddieSquaddieAction): boolean => {
        return TraitStatusStorageHelper.getStatus(data.traits, Trait.HEALING);
    },
    isHindering: (data: SquaddieSquaddieAction): boolean => {
        return TraitStatusStorageHelper.getStatus(data.traits, Trait.ATTACK);
    },
    sanitize: (data: SquaddieSquaddieAction): SquaddieSquaddieAction => {
        return sanitize(data);
    },
};

const sanitize = (data: SquaddieSquaddieAction): SquaddieSquaddieAction => {
    if (!data.id || !isValidValue(data.id)) {
        throw new Error('SquaddieAction cannot sanitize, missing id');
    }
    if (!data.name || !isValidValue(data.name)) {
        throw new Error('SquaddieAction cannot sanitize, missing name');
    }
    if (!isValidValue(data.minimumRange) || data.minimumRange < 0) {
        throw new Error('SquaddieAction cannot sanitize, missing or invalid minimumRange');
    }
    if (!isValidValue(data.maximumRange) || data.maximumRange < 0) {
        throw new Error('SquaddieAction cannot sanitize, missing or invalid maximumRange');
    }
    if (data.minimumRange > data.maximumRange) {
        throw new Error(`SquaddieAction cannot sanitize, minimumRange is more than maximumRange: ${data.minimumRange} ${data.maximumRange}`)
    }

    data.targetingShape = (isValidValue(data.targetingShape) && data.targetingShape !== TargetingShape.UNKNOWN) ? data.targetingShape : TargetingShape.SNAKE;
    data.actionPointCost = isValidValue(data.actionPointCost) ? data.actionPointCost : 1;
    data.traits = isValidValue(data.traits) ? data.traits : TraitStatusStorageHelper.newUsingTraitValues({});
    data.damageDescriptions = isValidValue(data.damageDescriptions) ? {...(data.damageDescriptions)} : {};
    data.healingDescriptions = isValidValue(data.healingDescriptions) ? {...(data.healingDescriptions)} : {};
    return data;
};
