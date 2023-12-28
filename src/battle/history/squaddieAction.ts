import {SquaddieSquaddieAction, SquaddieSquaddieActionService} from "../../squaddie/action";
import {TargetingShape} from "../targeting/targetingShapeGenerator";
import {SquaddieSquaddieActionDataService} from "./squaddieSquaddieAction";
import {TraitStatusStorageHelper} from "../../trait/traitStatusStorage";

describe('SquaddieAction', () => {
    it('returns the number of action points spent', () => {
        const longswordAction: SquaddieSquaddieAction = SquaddieSquaddieActionService.new({
            name: "longsword",
            id: "longsword",
            traits: TraitStatusStorageHelper.newUsingTraitValues(),
            actionPointCost: 1,
            minimumRange: 0,
            maximumRange: 1,
            targetingShape: TargetingShape.SNAKE,
        })
        const action = SquaddieSquaddieActionDataService.new({
            squaddieAction: longswordAction,
            targetLocation: {q: 1, r: 0},
            numberOfActionPointsSpent: 1,
        });

        expect(action.numberOfActionPointsSpent).toBe(1);
    });
});
