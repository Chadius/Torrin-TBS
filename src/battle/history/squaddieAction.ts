import {SquaddieAction, SquaddieActionHandler} from "../../squaddie/action";
import {TargetingShape} from "../targeting/targetingShapeGenerator";
import {SquaddieSquaddieAction} from "./squaddieSquaddieAction";
import {TraitStatusStorageHelper} from "../../trait/traitStatusStorage";

describe('SquaddieAction', () => {
    it('returns the number of action points spent', () => {
        const longswordAction: SquaddieAction = SquaddieActionHandler.new({
            name: "longsword",
            id: "longsword",
            traits: TraitStatusStorageHelper.newUsingTraitValues(),
            actionPointCost: 1,
            minimumRange: 0,
            maximumRange: 1,
            targetingShape: TargetingShape.SNAKE,
        })
        const action = new SquaddieSquaddieAction({
            squaddieAction: longswordAction,
            targetLocation: {q: 1, r: 0},
        });

        expect(action.numberOfActionPointsSpent).toBe(1);
    });
});
