import {TargetingShape} from "../targeting/targetingShapeGenerator";
import {DamageType} from "../../squaddie/squaddieService";
import {Trait} from "../../trait/traitStatusStorage";
import {SquaddieAction} from "../../squaddie/action";
import {AnySquaddieActionData, SquaddieActionType} from "./anySquaddieAction";
import {SquaddieActionsForThisRound} from "./squaddieActionsForThisRound";

describe('squaddie actions for this round', () => {
    it('can create new object from squaddie data', () => {
        const squaddieActionData: SquaddieAction = {
            id: "attackId",
            name: "cool attack",
            minimumRange: 0,
            maximumRange: 1,
            targetingShape: TargetingShape.SNAKE,
            damageDescriptions: {[DamageType.MIND]: 1},
            healingDescriptions: {},
            traits: {booleanTraits: {[Trait.ATTACK]: true}},
            actionPointCost: 1,
        };

        const anySquaddieActions: AnySquaddieActionData[] = [
            {
                type: SquaddieActionType.MOVEMENT,
                data: {
                    destination: {q: 0, r: 3},
                    numberOfActionPointsSpent: 1,
                }
            },
            {
                type: SquaddieActionType.SQUADDIE,
                data: {
                    squaddieAction: squaddieActionData,
                    numberOfActionPointsSpent: 1,
                    targetLocation: {q: 0, r: 2},
                }
            },
            {
                type: SquaddieActionType.END_TURN,
                data: {},
            },
        ];

        const actionsForThisRound: SquaddieActionsForThisRound = {
            squaddieTemplateId: "template id",
            battleSquaddieId: "battle id",
            startingLocation: {q: 0, r: 0},
            actions: anySquaddieActions,
        };

        const newActionForThisRound: SquaddieActionsForThisRound = {...actionsForThisRound};
        expect(newActionForThisRound.battleSquaddieId).toStrictEqual(actionsForThisRound.battleSquaddieId);
        expect(newActionForThisRound.squaddieTemplateId).toStrictEqual(actionsForThisRound.squaddieTemplateId);
        expect(newActionForThisRound.startingLocation).toStrictEqual(actionsForThisRound.startingLocation);
        expect(newActionForThisRound.actions).toStrictEqual(actionsForThisRound.actions);
    });
});
