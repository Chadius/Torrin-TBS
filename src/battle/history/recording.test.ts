import {Recording, RecordingHandler} from "./recording";
import {SquaddieActionsForThisRound, SquaddieActionsForThisRoundHandler} from "./squaddieActionsForThisRound";
import {BattleEvent} from "./battleEvent";
import {SquaddieInstructionInProgress, SquaddieInstructionInProgressHandler} from "./squaddieInstructionInProgress";
import {SquaddieEndTurnActionDataService} from "./squaddieEndTurnAction";
import {SquaddieMovementActionDataService} from "./squaddieMovementAction";

describe('Recording', () => {
    it('can add an event and retrieve it', () => {
        const recording: Recording = {
            history: []
        };

        const endTurnInstruction: SquaddieActionsForThisRound = {
            squaddieTemplateId: "player_squaddie",
            battleSquaddieId: "player_squaddie_0",
            startingLocation: {q: 0, r: 0},
            actions: [],
        };
        SquaddieActionsForThisRoundHandler.endTurn(endTurnInstruction);

        const squaddieMovesAndEndsTurn: SquaddieInstructionInProgress = {
            movingBattleSquaddieIds: [],
            squaddieActionsForThisRound: {
                squaddieTemplateId: "static",
                battleSquaddieId: "dynamic",
                startingLocation: {q: 2, r: 3},
                actions: [],
            },
            currentlySelectedAction: undefined,
        }
        SquaddieInstructionInProgressHandler.addConfirmedAction(squaddieMovesAndEndsTurn, SquaddieMovementActionDataService.new({
                destination: {q: 3, r: 6},
                numberOfActionPointsSpent: 1,
            })
        );
        SquaddieInstructionInProgressHandler.addConfirmedAction(squaddieMovesAndEndsTurn, SquaddieEndTurnActionDataService.new());

        RecordingHandler.addEvent(
            recording,
            {
                instruction: squaddieMovesAndEndsTurn,
                results: undefined,
            }
        );

        const history: BattleEvent[] = recording.history;
        expect(history).toHaveLength(1);
        expect(history[0]).toStrictEqual({
            instruction: squaddieMovesAndEndsTurn,
            results: undefined,
        });
    });
});
