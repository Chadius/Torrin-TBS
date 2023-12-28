import {SquaddieActionsForThisRound, SquaddieActionsForThisRoundHandler} from "./squaddieActionsForThisRound";
import {SquaddieMovementActionData} from "./squaddieMovementAction";
import {SquaddieSquaddieAction, SquaddieSquaddieActionService} from "../../squaddie/action";
import {TargetingShape} from "../targeting/targetingShapeGenerator";
import {SquaddieSquaddieActionData} from "./squaddieSquaddieAction";
import {SquaddieActionType} from "./anySquaddieAction";
import {TraitStatusStorageHelper} from "../../trait/traitStatusStorage";

describe('SquaddieInstruction', () => {
    it('can add a squaddie and location', () => {
        const instruction: SquaddieActionsForThisRound = {
            squaddieTemplateId: "new static squaddie",
            battleSquaddieId: "new dynamic squaddie",
            startingLocation: {q: 0, r: 0},
            actions: [],
        };

        expect(instruction.squaddieTemplateId).toBe("new static squaddie");
        expect(instruction.battleSquaddieId).toBe("new dynamic squaddie");
        expect(instruction.startingLocation).toStrictEqual({q: 0, r: 0});
    });
    it('can add starting location', () => {
        const instruction: SquaddieActionsForThisRound = {
            squaddieTemplateId: "new static squaddie",
            battleSquaddieId: "new dynamic squaddie",
            startingLocation: undefined,
            actions: [],
        };

        SquaddieActionsForThisRoundHandler.addStartingLocation(instruction, {q: 0, r: 0});
        expect(instruction.startingLocation).toStrictEqual({q: 0, r: 0});
    });
    it('will throw an error if a starting location is added a second time', () => {
        const instruction: SquaddieActionsForThisRound = {
            squaddieTemplateId: "new static squaddie",
            battleSquaddieId: "new dynamic squaddie",
            startingLocation: {q: 0, r: 0},
            actions: [],
        };

        const shouldThrowError = () => {
            SquaddieActionsForThisRoundHandler.addStartingLocation(instruction, {q: 0, r: 0});
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error);
        expect(() => {
            shouldThrowError()
        }).toThrow("already has starting location (0, 0)");
    });
    it('can add movement action and its results', () => {
        const instruction: SquaddieActionsForThisRound = {
            squaddieTemplateId: "new static squaddie",
            battleSquaddieId: "new dynamic squaddie",
            startingLocation: {q: 0, r: 0},
            actions: [],
        };
        SquaddieActionsForThisRoundHandler.addAction(instruction, {
            destination: {
                q: 1,
                r: 2,
            },
            numberOfActionPointsSpent: 2,
            type: SquaddieActionType.MOVEMENT,
        });


        const actionsAfterOneMovement = SquaddieActionsForThisRoundHandler.getActionsUsedThisRound(instruction);
        expect(actionsAfterOneMovement).toHaveLength(1);

        expect(actionsAfterOneMovement[0].type).toBe(SquaddieActionType.MOVEMENT);
        const moveAction: SquaddieMovementActionData = actionsAfterOneMovement[0] as SquaddieMovementActionData;
        expect(moveAction.destination).toStrictEqual({q: 1, r: 2});
        expect(moveAction.numberOfActionPointsSpent).toBe(2);

        SquaddieActionsForThisRoundHandler.addAction(instruction, {
            destination: {
                q: 2,
                r: 2,
            },
            numberOfActionPointsSpent: 1,
            type: SquaddieActionType.MOVEMENT,
        });

        const allActionsUsedThisRound = SquaddieActionsForThisRoundHandler.getActionsUsedThisRound(instruction);
        expect(allActionsUsedThisRound).toHaveLength(2);
        expect(SquaddieActionsForThisRoundHandler.totalActionPointsSpent(instruction)).toBe(3);
        expect(SquaddieActionsForThisRoundHandler.destinationLocation(instruction)).toStrictEqual({q: 2, r: 2});
    });
    it('can add squaddie action', () => {
        const instruction: SquaddieActionsForThisRound = {
            squaddieTemplateId: "new static squaddie",
            battleSquaddieId: "new dynamic squaddie",
            startingLocation: {q: 0, r: 0},
            actions: [],
        };
        const longswordAction: SquaddieSquaddieAction = SquaddieSquaddieActionService.new({
            name: "longsword",
            id: "longsword",
            traits: TraitStatusStorageHelper.newUsingTraitValues(),
            actionPointCost: 1,
            minimumRange: 0,
            maximumRange: 1,
            targetingShape: TargetingShape.SNAKE,
        });

        SquaddieActionsForThisRoundHandler.addAction(instruction, {
            squaddieAction: longswordAction,
            targetLocation: {
                q: 1,
                r: 0,
            },
            numberOfActionPointsSpent: 1,
            type: SquaddieActionType.SQUADDIE,
        });

        const actionsUsedAfterUsingOneAction = SquaddieActionsForThisRoundHandler.getActionsUsedThisRound(instruction);
        expect(actionsUsedAfterUsingOneAction).toHaveLength(1);

        expect(actionsUsedAfterUsingOneAction[0].type).toBe(SquaddieActionType.SQUADDIE);
        const actionUsed: SquaddieSquaddieActionData = actionsUsedAfterUsingOneAction[0] as SquaddieSquaddieActionData;
        expect(actionUsed.targetLocation).toStrictEqual({q: 1, r: 0});
        expect(actionUsed.numberOfActionPointsSpent).toBe(longswordAction.actionPointCost);

        SquaddieActionsForThisRoundHandler.addAction(instruction, {
            type: SquaddieActionType.SQUADDIE,
            squaddieAction: longswordAction,
            numberOfActionPointsSpent: 1,
            targetLocation: {q: 1, r: 0},
        });

        const actionsUsedThisRound = SquaddieActionsForThisRoundHandler.getActionsUsedThisRound(instruction);
        expect(actionsUsedThisRound).toHaveLength(2);
        expect(SquaddieActionsForThisRoundHandler.totalActionPointsSpent(instruction)).toBe(2);
        expect(SquaddieActionsForThisRoundHandler.destinationLocation(instruction)).toStrictEqual({q: 0, r: 0});
    });
    it('will return the start location as the destination if no movement actions are given', () => {
        const instruction: SquaddieActionsForThisRound = {
            squaddieTemplateId: "new static squaddie",
            battleSquaddieId: "new dynamic squaddie",
            startingLocation: {q: 0, r: 0},
            actions: [],
        };
        expect(SquaddieActionsForThisRoundHandler.destinationLocation(instruction)).toStrictEqual({q: 0, r: 0});
    });
    it('can add end turn action', () => {
        const instruction: SquaddieActionsForThisRound = {
            squaddieTemplateId: "new static squaddie",
            battleSquaddieId: "new dynamic squaddie",
            startingLocation: {q: 0, r: 0},
            actions: [],
        };
        SquaddieActionsForThisRoundHandler.endTurn(instruction);

        const actionsUsedThisRound = SquaddieActionsForThisRoundHandler.getActionsUsedThisRound(instruction);
        expect(actionsUsedThisRound).toHaveLength(1);

        expect(actionsUsedThisRound[0].type).toBe(SquaddieActionType.END_TURN);
        expect(SquaddieActionsForThisRoundHandler.totalActionPointsSpent(instruction)).toBe(3);
        expect(SquaddieActionsForThisRoundHandler.destinationLocation(instruction)).toStrictEqual({q: 0, r: 0});
    });
});
