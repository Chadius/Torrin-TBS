import {SquaddieActionsForThisRound} from "./squaddieActionsForThisRound";
import {SquaddieEndTurnAction} from "./squaddieEndTurnAction";
import {SquaddieMovementAction} from "./squaddieMovementAction";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {SquaddieAction} from "../../squaddie/action";
import {TargetingShape} from "../targeting/targetingShapeGenerator";
import {SquaddieSquaddieAction} from "./squaddieSquaddieAction";
import {TraitStatusStorage} from "../../trait/traitStatusStorage";

describe('SquaddieInstruction', () => {
    it('can add a squaddie and location', () => {
        const instruction: SquaddieActionsForThisRound = new SquaddieActionsForThisRound({
            squaddieTemplateId: "new static squaddie",
            battleSquaddieId: "new dynamic squaddie",
            startingLocation: new HexCoordinate({q: 0, r: 0}),
        });

        expect(instruction.getSquaddieTemplateId()).toBe("new static squaddie");
        expect(instruction.getBattleSquaddieId()).toBe("new dynamic squaddie");
        expect(instruction.getStartingLocation()).toStrictEqual(new HexCoordinate({q: 0, r: 0}));
    });
    it('can add starting location', () => {
        const instruction: SquaddieActionsForThisRound = new SquaddieActionsForThisRound({
            squaddieTemplateId: "new static squaddie",
            battleSquaddieId: "new dynamic squaddie",
        });

        instruction.addStartingLocation(new HexCoordinate({q: 0, r: 0}))
        expect(instruction.getStartingLocation()).toStrictEqual(new HexCoordinate({q: 0, r: 0}));
    });
    it('will throw an error if a starting location is added a second time', () => {
        const instruction: SquaddieActionsForThisRound = new SquaddieActionsForThisRound({
            squaddieTemplateId: "new static squaddie",
            battleSquaddieId: "new dynamic squaddie",
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
    it('can add movement action and its results', () => {
        const instruction: SquaddieActionsForThisRound = new SquaddieActionsForThisRound({
            squaddieTemplateId: "new static squaddie",
            battleSquaddieId: "new dynamic squaddie",
            startingLocation: new HexCoordinate({q: 0, r: 0})
        });
        instruction.addAction(new SquaddieMovementAction({
            destination: new HexCoordinate({q: 1, r: 2}),
            numberOfActionPointsSpent: 2,
        }));

        const actionsAfterOneMovement = instruction.getActionsUsedThisRound();
        expect(actionsAfterOneMovement).toHaveLength(1);

        expect(actionsAfterOneMovement[0]).toBeInstanceOf(SquaddieMovementAction);
        const moveAction: SquaddieMovementAction = actionsAfterOneMovement[0] as SquaddieMovementAction;
        expect(moveAction.destination).toStrictEqual(new HexCoordinate({q: 1, r: 2}));
        expect(moveAction.numberOfActionPointsSpent).toBe(2);

        instruction.addAction(new SquaddieMovementAction({
            destination: new HexCoordinate({q: 2, r: 2}),
            numberOfActionPointsSpent: 1,
        }));

        const allActionsUsedThisRound = instruction.getActionsUsedThisRound();
        expect(allActionsUsedThisRound).toHaveLength(2);
        expect(instruction.totalActionPointsSpent()).toBe(3);
        expect(instruction.destinationLocation()).toStrictEqual(new HexCoordinate({q: 2, r: 2}));
    });
    it('can add squaddie action', () => {
        const instruction: SquaddieActionsForThisRound = new SquaddieActionsForThisRound({
            squaddieTemplateId: "new static squaddie",
            battleSquaddieId: "new dynamic squaddie",
            startingLocation: new HexCoordinate({q: 0, r: 0})
        });
        const longswordAction: SquaddieAction = new SquaddieAction({
            name: "longsword",
            id: "longsword",
            traits: new TraitStatusStorage(),
            actionPointCost: 1,
            minimumRange: 0,
            maximumRange: 1,
            targetingShape: TargetingShape.Snake,
        });
        instruction.addSquaddieSquaddieAction(new SquaddieSquaddieAction({
            squaddieAction: longswordAction,
            targetLocation: new HexCoordinate({q: 1, r: 0})
        }));

        const actionsUsedAfterUsingOneAction = instruction.getActionsUsedThisRound();
        expect(actionsUsedAfterUsingOneAction).toHaveLength(1);

        expect(actionsUsedAfterUsingOneAction[0]).toBeInstanceOf(SquaddieSquaddieAction);
        const actionUsed: SquaddieSquaddieAction = actionsUsedAfterUsingOneAction[0] as SquaddieSquaddieAction;
        expect(actionUsed.targetLocation).toStrictEqual(new HexCoordinate({q: 1, r: 0}));
        expect(actionUsed.numberOfActionPointsSpent).toBe(longswordAction.actionPointCost);

        instruction.addSquaddieSquaddieAction(new SquaddieSquaddieAction({
            squaddieAction: longswordAction,
            targetLocation: new HexCoordinate({q: 1, r: 0})
        }));

        const actionsUsedThisRound = instruction.getActionsUsedThisRound();
        expect(actionsUsedThisRound).toHaveLength(2);
        expect(instruction.totalActionPointsSpent()).toBe(2);
        expect(instruction.destinationLocation()).toStrictEqual(new HexCoordinate({q: 0, r: 0}));
    });
    it('will return the start location as the destination if no movement actions are given', () => {
        const instruction: SquaddieActionsForThisRound = new SquaddieActionsForThisRound({
            squaddieTemplateId: "new static squaddie",
            battleSquaddieId: "new dynamic squaddie",
            startingLocation: new HexCoordinate({q: 0, r: 0}),
        });
        expect(instruction.destinationLocation()).toStrictEqual(new HexCoordinate({q: 0, r: 0}));
    });
    it('will return an undefined destination if no start location and no movement actions are given', () => {
        const instruction: SquaddieActionsForThisRound = new SquaddieActionsForThisRound({
            squaddieTemplateId: "new static squaddie",
            battleSquaddieId: "new dynamic squaddie",
        });
        expect(instruction.destinationLocation()).toBeUndefined();
    });
    it('can add end turn action', () => {
        const instruction: SquaddieActionsForThisRound = new SquaddieActionsForThisRound({
            squaddieTemplateId: "new static squaddie",
            battleSquaddieId: "new dynamic squaddie",
            startingLocation: new HexCoordinate({q: 0, r: 0}),
        });
        instruction.endTurn();

        const actionsUsedThisRound = instruction.getActionsUsedThisRound();
        expect(actionsUsedThisRound).toHaveLength(1);

        expect(actionsUsedThisRound[0]).toBeInstanceOf(SquaddieEndTurnAction);
        expect(instruction.totalActionPointsSpent()).toBe(3);
        expect(instruction.destinationLocation()).toStrictEqual(new HexCoordinate({q: 0, r: 0}));
    });
});
