import {SquaddieInstructionInProgress, SquaddieInstructionInProgressHandler} from "./squaddieInstructionInProgress";
import {SquaddieActionsForThisRound, SquaddieActionsForThisRoundHandler} from "./squaddieActionsForThisRound";
import {SquaddieActionHandler} from "../../squaddie/action";
import {SquaddieMovementAction} from "./squaddieMovementAction";
import {SquaddieSquaddieAction} from "./squaddieSquaddieAction";
import {SquaddieActionType} from "./anySquaddieAction";
import {TargetingShape} from "../targeting/targetingShapeGenerator";
import {TraitStatusStorageHelper} from "../../trait/traitStatusStorage";

const torrinInstruction: SquaddieActionsForThisRound = {
    battleSquaddieId: "Torrin 0",
    squaddieTemplateId: "Torrin",
    startingLocation: {q: 0, r: 0},
    actions: [],
};

const purifyingBlast = SquaddieActionHandler.new({
    name: "purifying stream",
    id: "purifying_stream",
    traits: TraitStatusStorageHelper.newUsingTraitValues(),
});

const purifyingBlastAction: SquaddieSquaddieAction = new SquaddieSquaddieAction({
    squaddieAction: purifyingBlast,
    targetLocation: {q: 3, r: 4},
});

describe('Current Squaddie Instruction', () => {
    it('can be reset', () => {
        const newInstruction: SquaddieInstructionInProgress = {
            squaddieActionsForThisRound: {
                battleSquaddieId: "torrin 0",
                squaddieTemplateId: "torrin",
                startingLocation: {q: 0, r: 0},
                actions: [],
            },
            currentlySelectedAction: {
                name: "purifying stream",
                id: "purifying_stream",
                traits: TraitStatusStorageHelper.newUsingTraitValues(),
                damageDescriptions: {},
                healingDescriptions: {},
                actionPointCost: 1,
                minimumRange: 0,
                maximumRange: 1,
                targetingShape: TargetingShape.Snake,
            },
            movingBattleSquaddieIds: [],
        };

        expect(SquaddieInstructionInProgressHandler.isReadyForNewSquaddie(newInstruction)).toBeFalsy();
    });

    it('will accept new squaddie and action if it is reset', () => {
        const newInstruction: SquaddieInstructionInProgress = {
            movingBattleSquaddieIds: [],
            currentlySelectedAction: undefined,
            squaddieActionsForThisRound: {
                squaddieTemplateId: "Torrin",
                battleSquaddieId: "Torrin 0",
                startingLocation: {q: 0, r: 0},
                actions: [],
            },
        };

        expect(SquaddieInstructionInProgressHandler.battleSquaddieId(newInstruction)).toBe("Torrin 0");

        SquaddieInstructionInProgressHandler.addConfirmedAction(newInstruction, purifyingBlastAction);

        const initialInstruction: SquaddieActionsForThisRound = newInstruction.squaddieActionsForThisRound;

        SquaddieActionsForThisRoundHandler.addAction(torrinInstruction, {
            type: SquaddieActionType.SQUADDIE,
            data: {
                squaddieAction: purifyingBlast,
                targetLocation: {q: 3, r: 4},
                numberOfActionPointsSpent: 1,
            }
        });

        expect(initialInstruction.battleSquaddieId).toBe(torrinInstruction.battleSquaddieId);
        expect(initialInstruction.squaddieTemplateId).toBe(torrinInstruction.squaddieTemplateId);
        expect(initialInstruction.startingLocation.q).toStrictEqual(torrinInstruction.startingLocation.q);
        expect(initialInstruction.startingLocation.r).toStrictEqual(torrinInstruction.startingLocation.r);

        expect(newInstruction.currentlySelectedAction).toStrictEqual(purifyingBlast);
        SquaddieInstructionInProgressHandler.addConfirmedAction(newInstruction, new SquaddieMovementAction({
            destination: {q: 2, r: 3},
            numberOfActionPointsSpent: 2,
        }));

        expect(newInstruction.squaddieActionsForThisRound.actions).toHaveLength(2);
        expect(SquaddieActionsForThisRoundHandler.totalActionPointsSpent(newInstruction.squaddieActionsForThisRound)).toBe(3);
        expect(SquaddieActionsForThisRoundHandler.destinationLocation(newInstruction.squaddieActionsForThisRound)).toStrictEqual(
            {q: 2, r: 3}
        );
    });

    it('will throw an error if an action is added without setting the squaddie', () => {
        const newInstruction: SquaddieInstructionInProgress = {
            squaddieActionsForThisRound: undefined,
            currentlySelectedAction: undefined,
            movingBattleSquaddieIds: undefined,
        };

        const shouldThrowError = () => {
            SquaddieInstructionInProgressHandler.addConfirmedAction(newInstruction, purifyingBlastAction);
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
            const newInstruction: SquaddieInstructionInProgress = {
                squaddieActionsForThisRound: {
                    squaddieTemplateId: "Torrin",
                    battleSquaddieId: "Torrin 0",
                    startingLocation: {q: 0, r: 0},
                    actions: [],
                },
                currentlySelectedAction: undefined,
                movingBattleSquaddieIds: [],
            };
            SquaddieInstructionInProgressHandler.markBattleSquaddieIdAsMoving(newInstruction, "Torrin 0");
            expect(SquaddieInstructionInProgressHandler.isBattleSquaddieIdMoving(newInstruction, "Torrin 0")).toBeTruthy();

            SquaddieInstructionInProgressHandler.removeBattleSquaddieIdAsMoving(newInstruction, "Torrin 0");
            expect(SquaddieInstructionInProgressHandler.isBattleSquaddieIdMoving(newInstruction, "Torrin 0")).toBeFalsy();
        });
    });
});
