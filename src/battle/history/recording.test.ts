import {Recording} from "./recording";
import {SquaddieActivitiesForThisRound} from "./squaddieActivitiesForThisRound";
import {BattleEvent} from "./battleEvent";
import {SquaddieInstructionInProgress} from "./squaddieInstructionInProgress";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {SquaddieMovementActivity} from "./squaddieMovementActivity";
import {SquaddieEndTurnActivity} from "./squaddieEndTurnActivity";

describe('Recording', () => {
    it('can add an event and retrieve it', () => {
        const recording = new Recording({});

        const endTurnInstruction: SquaddieActivitiesForThisRound = new SquaddieActivitiesForThisRound({
            staticSquaddieId: "player_squaddie",
            dynamicSquaddieId: "player_squaddie_0",
        });
        endTurnInstruction.endTurn();

        const squaddieMovesAndEndsTurn: SquaddieInstructionInProgress = new SquaddieInstructionInProgress({});
        squaddieMovesAndEndsTurn.addInitialState({
            staticSquaddieId: "static",
            dynamicSquaddieId: "dynamic",
            startingLocation: new HexCoordinate({q: 2, r: 3}),
        });
        squaddieMovesAndEndsTurn.addConfirmedActivity(new SquaddieMovementActivity({
            destination: new HexCoordinate({q: 3, r: 6}),
            numberOfActionsSpent: 1,
        }));
        squaddieMovesAndEndsTurn.addConfirmedActivity(new SquaddieEndTurnActivity());

        recording.addEvent(new BattleEvent({
            currentSquaddieInstruction: squaddieMovesAndEndsTurn,
        }));

        const history: BattleEvent[] = recording.history;
        expect(history).toHaveLength(1);
        expect(history[0]).toStrictEqual(new BattleEvent({
            currentSquaddieInstruction: squaddieMovesAndEndsTurn
        }));
    });
});
