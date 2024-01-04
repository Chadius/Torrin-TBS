import {Recording, RecordingHandler} from "./recording";
import {SquaddieActionsForThisRound, SquaddieActionsForThisRoundService} from "./squaddieActionsForThisRound";
import {BattleEvent} from "./battleEvent";
import {SquaddieInstructionInProgress} from "./squaddieInstructionInProgress";
import {ActionEffectEndTurnService} from "../../decision/actionEffectEndTurn";
import {ActionEffectMovementService} from "../../decision/actionEffectMovement";
import {DecisionService} from "../../decision/decision";

describe('Recording', () => {
    it('can add an event and retrieve it', () => {
        const recording: Recording = {
            history: []
        };

        const endTurnInstruction: SquaddieActionsForThisRound = SquaddieActionsForThisRoundService.new({
            squaddieTemplateId: "player_squaddie",
            battleSquaddieId: "player_squaddie_0",
            startingLocation: {q: 0, r: 0},
            decisions: [
                DecisionService.new({
                    actionEffects: [
                        ActionEffectEndTurnService.new()
                    ]
                })
            ]
        });

        const squaddieMovesAndEndsTurn: SquaddieInstructionInProgress = {
            movingBattleSquaddieIds: [],
            squaddieActionsForThisRound: SquaddieActionsForThisRoundService.new({
                squaddieTemplateId: "static",
                battleSquaddieId: "dynamic",
                startingLocation: {q: 2, r: 3},
                decisions: [
                    DecisionService.new({
                        actionEffects: [
                            ActionEffectMovementService.new({
                                destination: {q: 3, r: 6},
                                numberOfActionPointsSpent: 1,
                            })
                        ]
                    }),
                    DecisionService.new({
                        actionEffects: [
                            ActionEffectEndTurnService.new()
                        ]
                    }),
                ],
            }),
            currentlySelectedAction: undefined,
        }

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
