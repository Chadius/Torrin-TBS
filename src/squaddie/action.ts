import {assertsInteger} from "../utils/mathAssert";
import {Trait, TraitStatusStorage, TraitStatusStorageData} from "../trait/traitStatusStorage";
import {TargetingShape} from "../battle/targeting/targetingShapeGenerator";
import {DamageType, HealingType} from "./squaddieService";
import {ActionRange} from "./actionRange";

export interface SquaddieAction {
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
          }: {
        name?: string;
        id?: string;
        traits?: TraitStatusStorageData;
        actionPointCost?: number;
        damageDescriptions?: { [t in DamageType]?: number },
        healingDescriptions?: { [t in HealingType]?: number },
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

        return {
            name: name,
            id: id,
            targetingShape: TargetingShape.Snake,
            minimumRange: minimumRange,
            maximumRange: maximumRange,
            actionPointCost: actionPointCost || actionPointCost == 0 ? actionPointCost : 1,
            traits: traits,
            damageDescriptions: damageDescriptions ? {...(damageDescriptions)} : {},
            healingDescriptions: healingDescriptions ? {...(healingDescriptions)} : {},
        };
    },
    isHelpful: (data: SquaddieAction): boolean => {
        const traitStatus: TraitStatusStorage = new TraitStatusStorage({data: data.traits});
        return traitStatus.getStatus(Trait.HEALING);
    },
    isHindering: (data: SquaddieAction): boolean => {
        const traitStatus: TraitStatusStorage = new TraitStatusStorage({data: data.traits});
        return traitStatus.getStatus(Trait.ATTACK);
    },
};
