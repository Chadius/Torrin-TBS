import {SquaddieActivity} from "../../squaddie/activity";
import {TargetingShape} from "../targeting/targetingShapeGenerator";
import {SquaddieSquaddieActivity} from "./squaddieSquaddieActivity";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {TraitStatusStorage} from "../../trait/traitStatusStorage";

describe('SquaddieSquaddieActivity', () => {
    it('returns the number of actions spent', () => {
        const longswordActivity: SquaddieActivity = new SquaddieActivity({
            name: "longsword",
            id: "longsword",
            traits: new TraitStatusStorage(),
            actionsToSpend: 1,
            minimumRange: 0,
            maximumRange: 1,
            targetingShape: TargetingShape.Snake,
        })
        const activity = new SquaddieSquaddieActivity({
            squaddieActivity: longswordActivity,
            targetLocation: new HexCoordinate({q: 1, r: 0})
        });

        expect(activity.numberOfActionsSpent).toBe(1);
    });
});
