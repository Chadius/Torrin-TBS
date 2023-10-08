import {Recording} from "./recording";
import {SquaddieActionsForThisRound} from "./squaddieActionsForThisRound";
import {BattleEvent} from "./battleEvent";
import {SquaddieInstructionInProgress} from "./squaddieInstructionInProgress";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {SquaddieMovementAction} from "./squaddieMovementAction";
import {SquaddieEndTurnAction} from "./squaddieEndTurnAction";

describe('Recording', () => {
    it('can add an event and retrieve it', () => {
        const recording = new Recording({});

        const endTurnInstruction: SquaddieActionsForThisRound = new SquaddieActionsForThisRound({
            squaddietemplateId: "player_squaddie",
            dynamicSquaddieId: "player_squaddie_0",
        });
        endTurnInstruction.endTurn();

        const squaddieMovesAndEndsTurn: SquaddieInstructionInProgress = new SquaddieInstructionInProgress({});
        squaddieMovesAndEndsTurn.addInitialState({
            squaddietemplateId: "static",
            dynamicSquaddieId: "dynamic",
            startingLocation: new HexCoordinate({q: 2, r: 3}),
        });
        squaddieMovesAndEndsTurn.addConfirmedAction(new SquaddieMovementAction({
            destination: new HexCoordinate({q: 3, r: 6}),
            numberOfActionPointsSpent: 1,
        }));
        squaddieMovesAndEndsTurn.addConfirmedAction(new SquaddieEndTurnAction());

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
