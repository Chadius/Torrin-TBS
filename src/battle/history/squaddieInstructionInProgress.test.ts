import {SquaddieInstructionInProgress} from "./squaddieInstructionInProgress";
import {SquaddieActivitiesForThisRound} from "./squaddieActivitiesForThisRound";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {SquaddieSquaddieActivity} from "./squaddieSquaddieActivity";
import {squaddieActivityLongsword} from "../../utils/test/squaddieActivity";

describe('SquaddieInstructionInProgress', () => {
    it('will indicate the squaddie has not acted this round if they cancel', () => {
        const squaddieCurrentlyActing = new SquaddieInstructionInProgress({
            activitiesForThisRound: new SquaddieActivitiesForThisRound({
                dynamicSquaddieId: "dynamicSquaddieId",
                staticSquaddieId: "staticId",
                startingLocation: new HexCoordinate({q: 1, r: 1}),
            }),
            currentSquaddieActivity: squaddieActivityLongsword,
        });

        squaddieCurrentlyActing.cancelSelectedActivity();

        expect(squaddieCurrentlyActing.squaddieHasActedThisTurn).toBeFalsy();
        expect(squaddieCurrentlyActing.isReadyForNewSquaddie).toBeTruthy();
    });

    it('will indicate the squaddie has acted this round if they cancel after acting', () => {
        const longswordUsedThisRoundActivity = new SquaddieActivitiesForThisRound({
            dynamicSquaddieId: "dynamicSquaddieId",
            staticSquaddieId: "staticId",
            startingLocation: new HexCoordinate({q: 1, r: 1}),
        });
        longswordUsedThisRoundActivity.addActivity(new SquaddieSquaddieActivity({
            squaddieActivity: squaddieActivityLongsword,
            targetLocation: new HexCoordinate({q: 0, r: 0}),
        }));

        const squaddieCurrentlyActing = new SquaddieInstructionInProgress({
            activitiesForThisRound: longswordUsedThisRoundActivity,
            currentSquaddieActivity: squaddieActivityLongsword,
        });

        squaddieCurrentlyActing.cancelSelectedActivity();

        expect(squaddieCurrentlyActing.squaddieHasActedThisTurn).toBeTruthy();
        expect(squaddieCurrentlyActing.isReadyForNewSquaddie).toBeFalsy();
    });
});
