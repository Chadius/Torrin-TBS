import {SquaddieActivitiesForThisRound} from "./squaddieActivitiesForThisRound";
import {SquaddieEndTurnActivity} from "./squaddieEndTurnActivity";
import {SquaddieMovementActivity} from "./squaddieMovementActivity";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {SquaddieActivity} from "../../squaddie/activity";
import {TargetingShape} from "../targeting/targetingShapeGenerator";
import {SquaddieSquaddieActivity} from "./squaddieSquaddieActivity";
import {TraitStatusStorage} from "../../trait/traitStatusStorage";

describe('SquaddieInstruction', () => {
    it('can add a squaddie and location', () => {
        const instruction: SquaddieActivitiesForThisRound = new SquaddieActivitiesForThisRound({
            staticSquaddieId: "new static squaddie",
            dynamicSquaddieId: "new dynamic squaddie",
            startingLocation: new HexCoordinate({q: 0, r: 0}),
        });

        expect(instruction.getStaticSquaddieId()).toBe("new static squaddie");
        expect(instruction.getDynamicSquaddieId()).toBe("new dynamic squaddie");
        expect(instruction.getStartingLocation()).toStrictEqual(new HexCoordinate({q: 0, r: 0}));
    });
    it('can add starting location', () => {
        const instruction: SquaddieActivitiesForThisRound = new SquaddieActivitiesForThisRound({
            staticSquaddieId: "new static squaddie",
            dynamicSquaddieId: "new dynamic squaddie",
        });

        instruction.addStartingLocation(new HexCoordinate({q: 0, r: 0}))
        expect(instruction.getStartingLocation()).toStrictEqual(new HexCoordinate({q: 0, r: 0}));
    });
    it('will throw an error if a starting location is added a second time', () => {
        const instruction: SquaddieActivitiesForThisRound = new SquaddieActivitiesForThisRound({
            staticSquaddieId: "new static squaddie",
            dynamicSquaddieId: "new dynamic squaddie",
            startingLocation: new HexCoordinate({q: 0, r: 0}),
        });

        const shouldThrowError = () => {
            instruction.addStartingLocation(new HexCoordinate({q: 0, r: 0}))
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error);
        expect(() => {
            shouldThrowError()
        }).toThrow("already has starting location (0, 0)");
    });
    it('can add movement activity and its results', () => {
        const instruction: SquaddieActivitiesForThisRound = new SquaddieActivitiesForThisRound({
            staticSquaddieId: "new static squaddie",
            dynamicSquaddieId: "new dynamic squaddie",
            startingLocation: new HexCoordinate({q: 0, r: 0})
        });
        instruction.addActivity(new SquaddieMovementActivity({
            destination: new HexCoordinate({q: 1, r: 2}),
            numberOfActionsSpent: 2,
        }));

        const activitiesAfterOneMovement = instruction.getActivities();
        expect(activitiesAfterOneMovement).toHaveLength(1);

        expect(activitiesAfterOneMovement[0]).toBeInstanceOf(SquaddieMovementActivity);
        const moveActivity: SquaddieMovementActivity = activitiesAfterOneMovement[0] as SquaddieMovementActivity;
        expect(moveActivity.destination).toStrictEqual(new HexCoordinate({q: 1, r: 2}));
        expect(moveActivity.numberOfActionsSpent).toBe(2);

        instruction.addActivity(new SquaddieMovementActivity({
            destination: new HexCoordinate({q: 2, r: 2}),
            numberOfActionsSpent: 1,
        }));

        const allActivities = instruction.getActivities();
        expect(allActivities).toHaveLength(2);
        expect(instruction.totalActionsSpent()).toBe(3);
        expect(instruction.destinationLocation()).toStrictEqual(new HexCoordinate({q: 2, r: 2}));
    });
    it('can add squaddie activity', () => {
        const instruction: SquaddieActivitiesForThisRound = new SquaddieActivitiesForThisRound({
            staticSquaddieId: "new static squaddie",
            dynamicSquaddieId: "new dynamic squaddie",
            startingLocation: new HexCoordinate({q: 0, r: 0})
        });
        const longswordActivity: SquaddieActivity = new SquaddieActivity({
            name: "longsword",
            id: "longsword",
            traits: new TraitStatusStorage(),
            actionsToSpend: 1,
            minimumRange: 0,
            maximumRange: 1,
            targetingShape: TargetingShape.Snake,
        });
        instruction.addSquaddieSquaddieActivity(new SquaddieSquaddieActivity({
            squaddieActivity: longswordActivity,
            targetLocation: new HexCoordinate({q: 1, r: 0})
        }));

        const activitiesAfterOneActivity = instruction.getActivities();
        expect(activitiesAfterOneActivity).toHaveLength(1);

        expect(activitiesAfterOneActivity[0]).toBeInstanceOf(SquaddieSquaddieActivity);
        const squaddieSquaddieActivity: SquaddieSquaddieActivity = activitiesAfterOneActivity[0] as SquaddieSquaddieActivity;
        expect(squaddieSquaddieActivity.targetLocation).toStrictEqual(new HexCoordinate({q: 1, r: 0}));
        expect(squaddieSquaddieActivity.numberOfActionsSpent).toBe(longswordActivity.actionsToSpend);

        instruction.addSquaddieSquaddieActivity(new SquaddieSquaddieActivity({
            squaddieActivity: longswordActivity,
            targetLocation: new HexCoordinate({q: 1, r: 0})
        }));

        const allActivities = instruction.getActivities();
        expect(allActivities).toHaveLength(2);
        expect(instruction.totalActionsSpent()).toBe(2);
        expect(instruction.destinationLocation()).toStrictEqual(new HexCoordinate({q: 0, r: 0}));
    });
    it('will return the start location as the destination if no movement actions are given', () => {
        const instruction: SquaddieActivitiesForThisRound = new SquaddieActivitiesForThisRound({
            staticSquaddieId: "new static squaddie",
            dynamicSquaddieId: "new dynamic squaddie",
            startingLocation: new HexCoordinate({q: 0, r: 0}),
        });
        expect(instruction.destinationLocation()).toStrictEqual(new HexCoordinate({q: 0, r: 0}));
    });
    it('will return an undefined destination if no start location and no movement actions are given', () => {
        const instruction: SquaddieActivitiesForThisRound = new SquaddieActivitiesForThisRound({
            staticSquaddieId: "new static squaddie",
            dynamicSquaddieId: "new dynamic squaddie",
        });
        expect(instruction.destinationLocation()).toBeUndefined();
    });
    it('can add end turn action', () => {
        const instruction: SquaddieActivitiesForThisRound = new SquaddieActivitiesForThisRound({
            staticSquaddieId: "new static squaddie",
            dynamicSquaddieId: "new dynamic squaddie",
            startingLocation: new HexCoordinate({q: 0, r: 0}),
        });
        instruction.endTurn();

        const allActivities = instruction.getActivities();
        expect(allActivities).toHaveLength(1);

        expect(allActivities[0]).toBeInstanceOf(SquaddieEndTurnActivity);
        expect(instruction.totalActionsSpent()).toBe(3);
        expect(instruction.destinationLocation()).toStrictEqual(new HexCoordinate({q: 0, r: 0}));
    });
});
