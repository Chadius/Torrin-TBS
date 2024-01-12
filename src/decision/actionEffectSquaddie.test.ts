import {ActionEffectSquaddie, ActionEffectSquaddieService} from "./actionEffectSquaddie";
import {TargetingShape} from "../battle/targeting/targetingShapeGenerator";
import {DamageType} from "../squaddie/squaddieService";
import {Trait} from "../trait/traitStatusStorage";
import {ActionEffectType} from "./actionEffect";

describe('action effect squaddie', () => {
    it('can make a new action effect based on data', () => {
        const data: ActionEffectSquaddie = {
            type: ActionEffectType.SQUADDIE,
            targetLocation: {q: 0, r: 0},
            numberOfActionPointsSpent: 1,
            template: {
                id: "attackId",
                name: "cool attack",
                minimumRange: 0,
                maximumRange: 1,
                targetingShape: TargetingShape.SNAKE,
                damageDescriptions: {[DamageType.MIND]: 1},
                healingDescriptions: {},
                traits: {booleanTraits: {[Trait.ATTACK]: true}},
                actionPointCost: 1,
            }
        };

        const coolAttackAgainstOrigin: ActionEffectSquaddie = ActionEffectSquaddieService.new({
            ...data
        });
        expect(coolAttackAgainstOrigin.targetLocation).toStrictEqual(data.targetLocation);
        expect(coolAttackAgainstOrigin.numberOfActionPointsSpent).toStrictEqual(data.numberOfActionPointsSpent);
        expect(data.template)
            .toStrictEqual(coolAttackAgainstOrigin.template);
    });
    it('will use the action effect cost for the overall action point cost if it is not given', () => {
        const coolAttackAgainstOrigin: ActionEffectSquaddie = ActionEffectSquaddieService.new({
            targetLocation: {q: 0, r: 0},
            template: {
                id: "attackId",
                name: "cool attack",
                minimumRange: 0,
                maximumRange: 1,
                targetingShape: TargetingShape.SNAKE,
                damageDescriptions: {[DamageType.MIND]: 1},
                healingDescriptions: {},
                traits: {booleanTraits: {[Trait.ATTACK]: true}},
                actionPointCost: 9001,
            }
        });
        expect(coolAttackAgainstOrigin.numberOfActionPointsSpent).toStrictEqual(9001);
    });
});
