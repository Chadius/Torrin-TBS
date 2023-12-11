import {assertsInteger} from "../utils/mathAssert";
import {Trait, TraitStatusStorageHelper} from "../trait/traitStatusStorage";
import {TargetingShape} from "../battle/targeting/targetingShapeGenerator";
import {DamageType, HealingType} from "./squaddieService";
import {ActionRange} from "./actionRange";
import {isValidValue} from "../utils/validityCheck";

export interface SquaddieAction {
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

export const SquaddieActionHandler = {
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
    } & Partial<ActionRange>): SquaddieAction => {
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
            minimumRange: minimumRange,
            maximumRange: maximumRange,
            actionPointCost: actionPointCost,
            traits: traits,
            damageDescriptions: damageDescriptions,
            healingDescriptions: healingDescriptions,
            targetingShape: targetingShape,
        };

        sanitize(data);
        return data;
    },
    isHelpful: (data: SquaddieAction): boolean => {
        return TraitStatusStorageHelper.getStatus(data.traits, Trait.HEALING);
    },
    isHindering: (data: SquaddieAction): boolean => {
        return TraitStatusStorageHelper.getStatus(data.traits, Trait.ATTACK);
    },
    sanitize: (data: SquaddieAction) => {
        sanitize(data);
    },
};

const sanitize = (data: SquaddieAction) => {
    data.targetingShape = (isValidValue(data.targetingShape) && data.targetingShape !== TargetingShape.UNKNOWN) ? data.targetingShape : TargetingShape.SNAKE;
    data.actionPointCost = isValidValue(data.actionPointCost) ? data.actionPointCost : 1;
    data.traits = isValidValue(data.traits) ? data.traits : TraitStatusStorageHelper.newUsingTraitValues({});
    data.damageDescriptions = isValidValue(data.damageDescriptions) ? {...(data.damageDescriptions)} : {};
    data.healingDescriptions = isValidValue(data.healingDescriptions) ? {...(data.healingDescriptions)} : {};
};
