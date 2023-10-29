import {SquaddieInstructionInProgress, SquaddieInstructionInProgressHandler} from "./squaddieInstructionInProgress";
import {SquaddieActionsForThisRound, SquaddieActionsForThisRoundHandler} from "./squaddieActionsForThisRound";
import {longswordAction} from "../../utils/test/squaddieAction";
import {SquaddieActionType} from "./anySquaddieAction";

describe('SquaddieInstructionInProgress', () => {
    it('will indicate the squaddie has not acted this round if they cancel', () => {
        const squaddieCurrentlyActing: SquaddieInstructionInProgress = {
            movingBattleSquaddieIds: [],
            squaddieActionsForThisRound: {
                battleSquaddieId: "battleSquaddieId",
                squaddieTemplateId: "templateId",
                startingLocation: {q: 1, r: 1},
                actions: [],
            },
            currentlySelectedAction: longswordAction,
        };

        SquaddieInstructionInProgressHandler.cancelSelectedAction(squaddieCurrentlyActing);
        expect(SquaddieInstructionInProgressHandler.squaddieHasActedThisTurn(squaddieCurrentlyActing)).toBeFalsy();
        expect(SquaddieInstructionInProgressHandler.isReadyForNewSquaddie(squaddieCurrentlyActing)).toBeTruthy();
    });

    it('will indicate the squaddie has acted this round if they cancel after acting', () => {
        const longswordUsedThisRoundAction: SquaddieActionsForThisRound = {
            battleSquaddieId: "battleSquaddieId",
            squaddieTemplateId: "templateId",
            startingLocation: {q: 1, r: 1},
            actions: [],
        };

        SquaddieActionsForThisRoundHandler.addAction(longswordUsedThisRoundAction, {
            type: SquaddieActionType.SQUADDIE,
            data: {
                squaddieAction: longswordAction,
                targetLocation: {q: 0, r: 0},
            }
        });

        const squaddieCurrentlyActing: SquaddieInstructionInProgress = {
            squaddieActionsForThisRound: longswordUsedThisRoundAction,
            currentlySelectedAction: longswordAction,
            movingBattleSquaddieIds: [],
        };

        SquaddieInstructionInProgressHandler.cancelSelectedAction(squaddieCurrentlyActing);
        expect(SquaddieInstructionInProgressHandler.squaddieHasActedThisTurn(squaddieCurrentlyActing)).toBeTruthy();
        expect(SquaddieInstructionInProgressHandler.isReadyForNewSquaddie(squaddieCurrentlyActing)).toBeFalsy();
    });
});
