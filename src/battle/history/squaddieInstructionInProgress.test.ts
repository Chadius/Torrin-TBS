import {SquaddieInstructionInProgress} from "./squaddieInstructionInProgress";
import {SquaddieActionsForThisRound} from "./squaddieActionsForThisRound";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {longswordAction} from "../../utils/test/squaddieAction";
import {SquaddieActionType} from "./anySquaddieAction";

describe('SquaddieInstructionInProgress', () => {
    it('will indicate the squaddie has not acted this round if they cancel', () => {
        const squaddieCurrentlyActing = new SquaddieInstructionInProgress({
            actionsForThisRound: new SquaddieActionsForThisRound({
                battleSquaddieId: "battleSquaddieId",
                squaddieTemplateId: "templateId",
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
            battleSquaddieId: "battleSquaddieId",
            squaddieTemplateId: "templateId",
            startingLocation: new HexCoordinate({q: 1, r: 1}),
        });

        longswordUsedThisRoundAction.addAction({
            type: SquaddieActionType.SQUADDIE,
            data: {
                squaddieAction: longswordAction,
                targetLocation: {q: 0, r: 0},
            }
        });

        const squaddieCurrentlyActing = new SquaddieInstructionInProgress({
            actionsForThisRound: longswordUsedThisRoundAction,
            currentSquaddieAction: longswordAction,
        });

        squaddieCurrentlyActing.cancelSelectedAction();

        expect(squaddieCurrentlyActing.squaddieHasActedThisTurn).toBeTruthy();
        expect(squaddieCurrentlyActing.isReadyForNewSquaddie).toBeFalsy();
    });
});
