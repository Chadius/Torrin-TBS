import {assertsInteger} from "../utils/mathAssert";
import {Trait, TraitStatusStorageHelper} from "../trait/traitStatusStorage";
import {TargetingShape} from "../battle/targeting/targetingShapeGenerator";
import {DamageType, HealingType} from "../squaddie/squaddieService";
import {ActionRange} from "../squaddie/actionRange";
import {isValidValue} from "../utils/validityCheck";
import {ActionEffectType} from "./actionEffect";

export interface ActionEffectSquaddieTemplate {
    type: ActionEffectType.SQUADDIE;
    damageDescriptions: { [t in DamageType]?: number };
    healingDescriptions: { [t in HealingType]?: number };
    TODODELETEMEname: string;
    TODODELETEMEid: string;
    traits: {
        booleanTraits: { [key in Trait]?: boolean };
    };
    TODODELETEMEactionPointCost: number;
    minimumRange: number;
    maximumRange: number;
    targetingShape: TargetingShape;
}

export const ActionEffectSquaddieTemplateService = {
    new: ({
              TODODELETEMEactionPointCost,
              damageDescriptions,
              healingDescriptions,
              TODODELETEMEid,
              maximumRange,
              minimumRange,
              TODODELETEMEname,
              traits,
              targetingShape,
          }: {
        TODODELETEMEname: string;
        TODODELETEMEid: string;
        traits?: {
            booleanTraits: { [key in Trait]?: boolean };
        };
        TODODELETEMEactionPointCost?: number;
        damageDescriptions?: { [t in DamageType]?: number },
        healingDescriptions?: { [t in HealingType]?: number },
        targetingShape?: TargetingShape,
    } & Partial<ActionRange>): ActionEffectSquaddieTemplate => {
        if (minimumRange !== undefined) {
            assertsInteger(minimumRange);
        }
        if (maximumRange !== undefined) {
            assertsInteger(maximumRange);
        }
        if (TODODELETEMEactionPointCost !== undefined) {
            assertsInteger(TODODELETEMEactionPointCost);
        }
        if (TODODELETEMEactionPointCost) {
            assertsInteger(TODODELETEMEactionPointCost);
        }

        const data: ActionEffectSquaddieTemplate = {
            type: ActionEffectType.SQUADDIE,
            TODODELETEMEname: TODODELETEMEname,
            TODODELETEMEid: TODODELETEMEid,
            minimumRange: minimumRange ? minimumRange : 0,
            maximumRange: maximumRange ? maximumRange : 0,
            TODODELETEMEactionPointCost: TODODELETEMEactionPointCost,
            traits: traits,
            damageDescriptions: damageDescriptions,
            healingDescriptions: healingDescriptions,
            targetingShape: targetingShape,
        };

        sanitize(data);
        return data;
    },
    isHelpful: (data: ActionEffectSquaddieTemplate): boolean => {
        return TraitStatusStorageHelper.getStatus(data.traits, Trait.HEALING);
    },
    isHindering: (data: ActionEffectSquaddieTemplate): boolean => {
        return TraitStatusStorageHelper.getStatus(data.traits, Trait.ATTACK);
    },
    sanitize: (data: ActionEffectSquaddieTemplate): ActionEffectSquaddieTemplate => {
        return sanitize(data);
    },
};

const sanitize = (data: ActionEffectSquaddieTemplate): ActionEffectSquaddieTemplate => {
    if (!data.TODODELETEMEid || !isValidValue(data.TODODELETEMEid)) {
        throw new Error('SquaddieAction cannot sanitize, missing id');
    }
    if (!data.TODODELETEMEname || !isValidValue(data.TODODELETEMEname)) {
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
    data.TODODELETEMEactionPointCost = isValidValue(data.TODODELETEMEactionPointCost) ? data.TODODELETEMEactionPointCost : 1;
    data.traits = isValidValue(data.traits) ? data.traits : TraitStatusStorageHelper.newUsingTraitValues({});
    data.damageDescriptions = isValidValue(data.damageDescriptions) ? {...(data.damageDescriptions)} : {};
    data.healingDescriptions = isValidValue(data.healingDescriptions) ? {...(data.healingDescriptions)} : {};
    return data;
};
