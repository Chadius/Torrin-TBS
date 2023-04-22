import {SquaddieEndTurnActivity, SquaddieInstruction, SquaddieMovementActivity} from "./squaddieInstruction";

describe('SquaddieInstruction', () => {
    it('can add a squaddie and location', () => {
        const instruction: SquaddieInstruction = new SquaddieInstruction({
            staticSquaddieId: "new static squaddie",
            dynamicSquaddieId: "new dynamic squaddie",
            startingLocation: {q: 0, r: 0}
        });

        expect(instruction.getStaticSquaddieId()).toBe("new static squaddie");
        expect(instruction.getDynamicSquaddieId()).toBe("new dynamic squaddie");
        expect(instruction.getStartingLocation()).toStrictEqual({q: 0, r: 0});
    });
    it('can add starting location', () => {
        const instruction: SquaddieInstruction = new SquaddieInstruction({
            staticSquaddieId: "new static squaddie",
            dynamicSquaddieId: "new dynamic squaddie",
        });

        instruction.addStartingLocation({q: 0, r: 0})
        expect(instruction.getStartingLocation()).toStrictEqual({q: 0, r: 0});
    });
    it('will throw an error if a starting location is added a second time', () => {
        const instruction: SquaddieInstruction = new SquaddieInstruction({
            staticSquaddieId: "new static squaddie",
            dynamicSquaddieId: "new dynamic squaddie",
            startingLocation: {q: 0, r: 0}
        });

        const shouldThrowError = () => {
            instruction.addStartingLocation({q: 0, r: 0})
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error);
        expect(() => {
            shouldThrowError()
        }).toThrow("already has starting location (0, 0)");
    });
    it('can add movement activity and its results', () => {
        const instruction: SquaddieInstruction = new SquaddieInstruction({
            staticSquaddieId: "new static squaddie",
            dynamicSquaddieId: "new dynamic squaddie",
            startingLocation: {q: 0, r: 0}
        });
        instruction.addMovement(new SquaddieMovementActivity({
            destination: {q: 1, r: 2},
            numberOfActionsSpent: 2,
        }));

        const activitiesAfterOneMovement = instruction.getActivities();
        expect(activitiesAfterOneMovement).toHaveLength(1);
        expect(activitiesAfterOneMovement[0].destination).toStrictEqual({q: 1, r: 2});
        expect(activitiesAfterOneMovement[0].numberOfActionsSpent).toBe(2);

        instruction.addMovement(new SquaddieMovementActivity({
            destination: {q: 2, r: 2},
            numberOfActionsSpent: 1,
        }));

        const allActivities = instruction.getActivities();
        expect(allActivities).toHaveLength(2);
        expect(instruction.totalActionsSpent()).toBe(3);
        expect(instruction.destinationLocation()).toStrictEqual({q: 2, r: 2});
    });
    it('will return the start location as the destination if no movement actions are given', () => {
        const instruction: SquaddieInstruction = new SquaddieInstruction({
            staticSquaddieId: "new static squaddie",
            dynamicSquaddieId: "new dynamic squaddie",
            startingLocation: {q: 0, r: 0},
        });
        expect(instruction.destinationLocation()).toStrictEqual({q: 0, r: 0});
    });
    it('will return an undefined destination if no start location and no movement actions are given', () => {
        const instruction: SquaddieInstruction = new SquaddieInstruction({
            staticSquaddieId: "new static squaddie",
            dynamicSquaddieId: "new dynamic squaddie",
        });
        expect(instruction.destinationLocation()).toBeUndefined();
    });
    it('can add end turn action', () => {
        const instruction: SquaddieInstruction = new SquaddieInstruction({
            staticSquaddieId: "new static squaddie",
            dynamicSquaddieId: "new dynamic squaddie",
            startingLocation: {q: 0, r: 0},
        });
        instruction.endTurn();

        const allActivities = instruction.getActivities();
        expect(allActivities).toHaveLength(1);

        expect(allActivities[0]).toBeInstanceOf(SquaddieEndTurnActivity);
        expect(instruction.totalActionsSpent()).toBe(3);
        expect(instruction.destinationLocation()).toStrictEqual({q: 0, r: 0});
    });
});