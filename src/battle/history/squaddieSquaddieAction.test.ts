import {SquaddieSquaddieAction, SquaddieSquaddieActionData} from "./squaddieSquaddieAction";
import {TargetingShape} from "../targeting/targetingShapeGenerator";
import {DamageType} from "../../squaddie/squaddieService";
import {Trait} from "../../trait/traitStatusStorage";

describe('squaddieSquaddieAction', () => {
    it('can make a new squaddie action based on data', () => {
        const data: SquaddieSquaddieActionData = {
            targetLocation: {q: 0, r: 0},
            numberOfActionPointsSpent: 1,
            squaddieAction: {
                id: "attackId",
                name: "cool attack",
                minimumRange: 0,
                maximumRange: 1,
                targetingShape: TargetingShape.Snake,
                damageDescriptions: {[DamageType.Mind]: 1},
                healingDescriptions: {},
                traits: {booleanTraits: {[Trait.ATTACK]: true}},
                actionPointCost: 1,
            }
        };

        const coolAttackAgainstOrigin: SquaddieSquaddieAction = new SquaddieSquaddieAction({data});
        expect(coolAttackAgainstOrigin.targetLocation).toStrictEqual(data.targetLocation);
        expect(coolAttackAgainstOrigin.numberOfActionPointsSpent).toStrictEqual(data.numberOfActionPointsSpent);
        expect(data.squaddieAction)
            .toStrictEqual(coolAttackAgainstOrigin.squaddieAction);
    });
});
