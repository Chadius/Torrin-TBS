import {CurrentSquaddieInstruction} from "./currentSquaddieInstruction";
import {SquaddieInstruction} from "./squaddieInstruction";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {SquaddieActivity} from "../../squaddie/activity";
import {NullTraitStatusStorage} from "../../trait/traitStatusStorage";
import {SquaddieMovementActivity} from "./squaddieMovementActivity";
import {SquaddieSquaddieActivity} from "./squaddieSquaddieActivity";

const torrinInstruction = new SquaddieInstruction({
    dynamicSquaddieId: "Torrin 0",
    staticSquaddieId: "Torrin",
    startingLocation: new HexCoordinate({q: 0, r: 0}),
});

const purifyingBlast = new SquaddieActivity({
    name: "purifying stream",
    id: "purifying_stream",
    traits: NullTraitStatusStorage(),
});

const purifyingBlastActivity: SquaddieSquaddieActivity = new SquaddieSquaddieActivity({
    squaddieActivity: purifyingBlast,
    targetLocation: new HexCoordinate({q: 3, r: 4})
});

describe('Current Squaddie Instruction', () => {
    it('can be reset', () => {
        const newInstruction = new CurrentSquaddieInstruction({
            instruction: new SquaddieInstruction({
                dynamicSquaddieId: "torrin 0",
                staticSquaddieId: "torrin",
                startingLocation: new HexCoordinate({q: 0, r: 0}),
            }),
            currentSquaddieActivity: new SquaddieActivity({
                name: "purifying stream",
                id: "purifying_stream",
                traits: NullTraitStatusStorage(),
            }),
        });

        expect(newInstruction.isReadyForNewSquaddie()).toBeFalsy();
        newInstruction.reset();
        expect(newInstruction.isReadyForNewSquaddie()).toBeTruthy();
    });

    it('will accept new squaddie and activity if it is reset', () => {
        const newInstruction = new CurrentSquaddieInstruction({
        });

        newInstruction.addSquaddie(
            {
                staticSquaddieId: "Torrin",
                dynamicSquaddieId: "Torrin 0",
                startingLocation: new HexCoordinate({q: 0, r: 0})
            }
        );
        expect(newInstruction.dynamicSquaddieId).toBe("Torrin 0");

        newInstruction.addActivity(purifyingBlastActivity);

        const initialInstruction: SquaddieInstruction = newInstruction.instruction;

        torrinInstruction.addActivity(purifyingBlastActivity);
        expect(initialInstruction).toStrictEqual(torrinInstruction);
        expect(newInstruction.currentSquaddieActivity).toStrictEqual(purifyingBlast);

        newInstruction.addActivity(new SquaddieMovementActivity({
            destination: new HexCoordinate({q: 2, r: 3}),
            numberOfActionsSpent: 2,
        }));
        expect(newInstruction.instruction.getActivities()).toHaveLength(2);
        expect(newInstruction.instruction.totalActionsSpent()).toBe(3);
        expect(newInstruction.instruction.destinationLocation()).toStrictEqual(
            new HexCoordinate({q: 2, r: 3})
        );
    });

    it('will throw an error if an activity is added without setting the squaddie', () => {
        const newInstruction = new CurrentSquaddieInstruction({
        });

        const shouldThrowError = () => {
            newInstruction.addActivity(purifyingBlastActivity);
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error);
        expect(() => {
            shouldThrowError()
        }).toThrow("no squaddie found, cannot add activity");
    });
});
