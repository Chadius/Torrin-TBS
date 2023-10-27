import {SquaddieActionsForThisRound} from "./squaddieActionsForThisRound";
import {SquaddieMovementActionData} from "./squaddieMovementAction";
import {SquaddieAction} from "../../squaddie/action";
import {TargetingShape} from "../targeting/targetingShapeGenerator";
import {SquaddieSquaddieActionData} from "./squaddieSquaddieAction";
import {TraitStatusStorage} from "../../trait/traitStatusStorage";
import {SquaddieActionType} from "./anySquaddieAction";

describe('SquaddieInstruction', () => {
    it('can add a squaddie and location', () => {
        const instruction: SquaddieActionsForThisRound = new SquaddieActionsForThisRound({
            squaddieTemplateId: "new static squaddie",
            battleSquaddieId: "new dynamic squaddie",
            startingLocation: {q: 0, r: 0},
            actions: [],
        });

        expect(instruction.squaddieTemplateId).toBe("new static squaddie");
        expect(instruction.battleSquaddieId).toBe("new dynamic squaddie");
        expect(instruction.startingLocation).toStrictEqual({q: 0, r: 0});
    });
    it('can add starting location', () => {
        const instruction: SquaddieActionsForThisRound = new SquaddieActionsForThisRound({
            squaddieTemplateId: "new static squaddie",
            battleSquaddieId: "new dynamic squaddie",
            startingLocation: undefined,
            actions: [],
        });

        instruction.addStartingLocation({q: 0, r: 0});
        expect(instruction.startingLocation).toStrictEqual({q: 0, r: 0});
    });
    it('will throw an error if a starting location is added a second time', () => {
        const instruction: SquaddieActionsForThisRound = new SquaddieActionsForThisRound({
            squaddieTemplateId: "new static squaddie",
            battleSquaddieId: "new dynamic squaddie",
            startingLocation: {q: 0, r: 0},
            actions: [],
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
    it('can add movement action and its results', () => {
        const instruction: SquaddieActionsForThisRound = new SquaddieActionsForThisRound({
            squaddieTemplateId: "new static squaddie",
            battleSquaddieId: "new dynamic squaddie",
            startingLocation: {q: 0, r: 0},
            actions: [],
        });
        instruction.addAction({
            data: {
                destination: {
                    q: 1,
                    r: 2,
                },
                numberOfActionPointsSpent: 2,
            },
            type: SquaddieActionType.MOVEMENT,
        });


        const actionsAfterOneMovement = instruction.getActionsUsedThisRound();
        expect(actionsAfterOneMovement).toHaveLength(1);

        expect(actionsAfterOneMovement[0].type).toBe(SquaddieActionType.MOVEMENT);
        const moveAction: SquaddieMovementActionData = actionsAfterOneMovement[0].data as SquaddieMovementActionData;
        expect(moveAction.destination).toStrictEqual({q: 1, r: 2});
        expect(moveAction.numberOfActionPointsSpent).toBe(2);

        instruction.addAction({
            data: {
                destination: {
                    q: 2,
                    r: 2,
                },
                numberOfActionPointsSpent: 1,
            },
            type: SquaddieActionType.MOVEMENT,
        });

        const allActionsUsedThisRound = instruction.getActionsUsedThisRound();
        expect(allActionsUsedThisRound).toHaveLength(2);
        expect(instruction.totalActionPointsSpent()).toBe(3);
        expect(instruction.destinationLocation()).toStrictEqual({q: 2, r: 2});
    });
    it('can add squaddie action', () => {
        const instruction: SquaddieActionsForThisRound = new SquaddieActionsForThisRound({
            squaddieTemplateId: "new static squaddie",
            battleSquaddieId: "new dynamic squaddie",
            startingLocation: {q: 0, r: 0},
            actions: [],
        });
        const longswordAction: SquaddieAction = new SquaddieAction({
            name: "longsword",
            id: "longsword",
            traits: new TraitStatusStorage({}),
            actionPointCost: 1,
            minimumRange: 0,
            maximumRange: 1,
            targetingShape: TargetingShape.Snake,
        });

        instruction.addAction({
            data: {
                squaddieAction: longswordAction,
                targetLocation: {
                    q: 1,
                    r: 0,
                },
                numberOfActionPointsSpent: 1,
            },
            type: SquaddieActionType.SQUADDIE,
        });

        const actionsUsedAfterUsingOneAction = instruction.getActionsUsedThisRound();
        expect(actionsUsedAfterUsingOneAction).toHaveLength(1);

        expect(actionsUsedAfterUsingOneAction[0].type).toBe(SquaddieActionType.SQUADDIE);
        const actionUsed: SquaddieSquaddieActionData = actionsUsedAfterUsingOneAction[0].data as SquaddieSquaddieActionData;
        expect(actionUsed.targetLocation).toStrictEqual({q: 1, r: 0});
        expect(actionUsed.numberOfActionPointsSpent).toBe(longswordAction.actionPointCost);

        instruction.addAction({
            type: SquaddieActionType.SQUADDIE,
            data: {
                squaddieAction: longswordAction,
                numberOfActionPointsSpent: 1,
                targetLocation: {q: 1, r: 0},
            }
        });

        const actionsUsedThisRound = instruction.getActionsUsedThisRound();
        expect(actionsUsedThisRound).toHaveLength(2);
        expect(instruction.totalActionPointsSpent()).toBe(2);
        expect(instruction.destinationLocation()).toStrictEqual({q: 0, r: 0});
    });
    it('will return the start location as the destination if no movement actions are given', () => {
        const instruction: SquaddieActionsForThisRound = new SquaddieActionsForThisRound({
            squaddieTemplateId: "new static squaddie",
            battleSquaddieId: "new dynamic squaddie",
            startingLocation: {q: 0, r: 0},
            actions: [],
        });
        expect(instruction.destinationLocation()).toStrictEqual({q: 0, r: 0});
    });
    it('can add end turn action', () => {
        const instruction: SquaddieActionsForThisRound = new SquaddieActionsForThisRound({
            squaddieTemplateId: "new static squaddie",
            battleSquaddieId: "new dynamic squaddie",
            startingLocation: {q: 0, r: 0},
            actions: [],
        });
        instruction.endTurn();

        const actionsUsedThisRound = instruction.getActionsUsedThisRound();
        expect(actionsUsedThisRound).toHaveLength(1);

        expect(actionsUsedThisRound[0].type).toBe(SquaddieActionType.END_TURN);
        expect(instruction.totalActionPointsSpent()).toBe(3);
        expect(instruction.destinationLocation()).toStrictEqual({q: 0, r: 0});
    });
});
