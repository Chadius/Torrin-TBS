import {SquaddieInstructionInProgress} from "./squaddieInstructionInProgress";
import {SquaddieActionsForThisRound} from "./squaddieActionsForThisRound";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {SquaddieAction} from "../../squaddie/action";
import {SquaddieMovementAction} from "./squaddieMovementAction";
import {SquaddieSquaddieAction} from "./squaddieSquaddieAction";
import {TraitStatusStorage} from "../../trait/traitStatusStorage";

const torrinInstruction = new SquaddieActionsForThisRound({
    dynamicSquaddieId: "Torrin 0",
    staticSquaddieId: "Torrin",
    startingLocation: new HexCoordinate({q: 0, r: 0}),
});

const purifyingBlast = new SquaddieAction({
    name: "purifying stream",
    id: "purifying_stream",
    traits: new TraitStatusStorage(),
});

const purifyingBlastAction: SquaddieSquaddieAction = new SquaddieSquaddieAction({
    squaddieAction: purifyingBlast,
    targetLocation: new HexCoordinate({q: 3, r: 4})
});

describe('Current Squaddie Instruction', () => {
    it('can be reset', () => {
        const newInstruction = new SquaddieInstructionInProgress({
            actionsForThisRound: new SquaddieActionsForThisRound({
                dynamicSquaddieId: "torrin 0",
                staticSquaddieId: "torrin",
                startingLocation: new HexCoordinate({q: 0, r: 0}),
            }),
            currentSquaddieAction: new SquaddieAction({
                name: "purifying stream",
                id: "purifying_stream",
                traits: new TraitStatusStorage(),
            }),
        });

        expect(newInstruction.isReadyForNewSquaddie).toBeFalsy();
        newInstruction.reset();
        expect(newInstruction.isReadyForNewSquaddie).toBeTruthy();
    });

    it('will accept new squaddie and action if it is reset', () => {
        const newInstruction = new SquaddieInstructionInProgress({});

        newInstruction.addInitialState(
            {
                staticSquaddieId: "Torrin",
                dynamicSquaddieId: "Torrin 0",
                startingLocation: new HexCoordinate({q: 0, r: 0})
            }
        );
        expect(newInstruction.dynamicSquaddieId).toBe("Torrin 0");

        newInstruction.addConfirmedAction(purifyingBlastAction);

        const initialInstruction: SquaddieActionsForThisRound = newInstruction.squaddieActionsForThisRound;

        torrinInstruction.addAction(purifyingBlastAction);
        expect(initialInstruction).toStrictEqual(torrinInstruction);
        expect(newInstruction.currentlySelectedAction).toStrictEqual(purifyingBlast);

        newInstruction.addConfirmedAction(new SquaddieMovementAction({
            destination: new HexCoordinate({q: 2, r: 3}),
            numberOfActionPointsSpent: 2,
        }));
        expect(newInstruction.squaddieActionsForThisRound.getActionsUsedThisRound()).toHaveLength(2);
        expect(newInstruction.squaddieActionsForThisRound.totalActionPointsSpent()).toBe(3);
        expect(newInstruction.squaddieActionsForThisRound.destinationLocation()).toStrictEqual(
            new HexCoordinate({q: 2, r: 3})
        );
    });

    it('will throw an error if an action is added without setting the squaddie', () => {
        const newInstruction = new SquaddieInstructionInProgress({});

        const shouldThrowError = () => {
            newInstruction.addConfirmedAction(purifyingBlastAction);
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error);
        expect(() => {
            shouldThrowError()
        }).toThrow("no squaddie found, cannot add action");
    });

    describe('mark squaddie as moving', () => {
        it('can mark dynamic squaddies as moving', () => {
            const newInstruction = new SquaddieInstructionInProgress({});
            newInstruction.addInitialState(
                {
                    staticSquaddieId: "Torrin",
                    dynamicSquaddieId: "Torrin 0",
                    startingLocation: new HexCoordinate({q: 0, r: 0})
                }
            );
            newInstruction.markSquaddieDynamicIdAsMoving("Torrin 0");
            expect(newInstruction.isSquaddieDynamicIdMoving("Torrin 0")).toBeTruthy();

            newInstruction.removeSquaddieDynamicIdAsMoving("Torrin 0");
            expect(newInstruction.isSquaddieDynamicIdMoving("Torrin 0")).toBeFalsy();
        });
    });
});
