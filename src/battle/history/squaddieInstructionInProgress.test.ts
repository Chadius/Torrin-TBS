import {SquaddieInstructionInProgress} from "./squaddieInstructionInProgress";
import {SquaddieActionsForThisRound} from "./squaddieActionsForThisRound";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {SquaddieSquaddieAction} from "./squaddieSquaddieAction";
import {longswordAction} from "../../utils/test/squaddieAction";

describe('SquaddieInstructionInProgress', () => {
    it('will indicate the squaddie has not acted this round if they cancel', () => {
        const squaddieCurrentlyActing = new SquaddieInstructionInProgress({
            actionsForThisRound: new SquaddieActionsForThisRound({
                dynamicSquaddieId: "dynamicSquaddieId",
                staticSquaddieId: "staticId",
                startingLocation: new HexCoordinate({q: 1, r: 1}),
            }),
            currentSquaddieAction: longswordAction,
        });

        squaddieCurrentlyActing.cancelSelectedAction();

        expect(squaddieCurrentlyActing.squaddieHasActedThisTurn).toBeFalsy();
        expect(squaddieCurrentlyActing.isReadyForNewSquaddie).toBeTruthy();
    });

    it('will indicate the squaddie has acted this round if they cancel after acting', () => {
        const longswordUsedThisRoundAction = new SquaddieActionsForThisRound({
            dynamicSquaddieId: "dynamicSquaddieId",
            staticSquaddieId: "staticId",
            startingLocation: new HexCoordinate({q: 1, r: 1}),
        });
        longswordUsedThisRoundAction.addAction(new SquaddieSquaddieAction({
            squaddieAction: longswordAction,
            targetLocation: new HexCoordinate({q: 0, r: 0}),
        }));

        const squaddieCurrentlyActing = new SquaddieInstructionInProgress({
            actionsForThisRound: longswordUsedThisRoundAction,
            currentSquaddieAction: longswordAction,
        });

        squaddieCurrentlyActing.cancelSelectedAction();

        expect(squaddieCurrentlyActing.squaddieHasActedThisTurn).toBeTruthy();
        expect(squaddieCurrentlyActing.isReadyForNewSquaddie).toBeFalsy();
    });
});
