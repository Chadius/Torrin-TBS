import {ActionEffectSquaddie, ActionEffectSquaddieService} from "./actionEffectSquaddie";
import {TargetingShape} from "../targeting/targetingShapeGenerator";
import {DamageType} from "../../squaddie/squaddieService";
import {Trait} from "../../trait/traitStatusStorage";
import {ActionEffectType} from "../../squaddie/actionEffect";

describe('squaddieSquaddieAction', () => {
    it('can make a new squaddie action based on data', () => {
        const data: ActionEffectSquaddie = {
            type: ActionEffectType.SQUADDIE,
            targetLocation: {q: 0, r: 0},
            numberOfActionPointsSpent: 1,
            squaddieAction: {
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
        expect(data.squaddieAction)
            .toStrictEqual(coolAttackAgainstOrigin.squaddieAction);
    });
});
