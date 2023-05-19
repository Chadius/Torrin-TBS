import {Recording} from "./recording";
import {SquaddieInstruction} from "./squaddieInstruction";
import {BattleEvent} from "./battleEvent";

describe('Recording', () => {
    it('can add an event and retrieve it', () => {
        const recording = new Recording({});

        const endTurnInstruction: SquaddieInstruction = new SquaddieInstruction({
            staticSquaddieId: "player_squaddie",
            dynamicSquaddieId: "player_squaddie_0",
        });
        endTurnInstruction.endTurn();

        recording.addEvent(new BattleEvent({
            instruction: endTurnInstruction,
        }));

        const history: BattleEvent[] = recording.getHistory();
        expect(history).toHaveLength(1);
        expect(history[0]).toStrictEqual(new BattleEvent({
            instruction: endTurnInstruction
        }));
    });
});
