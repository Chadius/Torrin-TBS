import {SquaddieAction} from "../../squaddie/action";
import {TargetingShape} from "../targeting/targetingShapeGenerator";
import {SquaddieSquaddieAction} from "./squaddieSquaddieAction";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {TraitStatusStorage} from "../../trait/traitStatusStorage";

describe('SquaddieAction', () => {
    it('returns the number of action points spent', () => {
        const longswordAction: SquaddieAction = new SquaddieAction({
            name: "longsword",
            id: "longsword",
            traits: new TraitStatusStorage({}),
            actionPointCost: 1,
            minimumRange: 0,
            maximumRange: 1,
            targetingShape: TargetingShape.Snake,
        })
        const action = new SquaddieSquaddieAction({
            squaddieAction: longswordAction,
            targetLocation: new HexCoordinate({q: 1, r: 0})
        });

        expect(action.numberOfActionPointsSpent).toBe(1);
    });
});
