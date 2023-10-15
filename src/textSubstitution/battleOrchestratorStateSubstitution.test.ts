import {BattleOrchestratorState} from "../battle/orchestrator/battleOrchestratorState";
import {BattlePhase} from "../battle/orchestratorComponents/battlePhaseTracker";
import {SubstituteTextUsingBattleOrchestraState} from "./BattleOrchestratorStateSubstitution";

describe("BattleOrchestratorStateSubstitution", () => {
    it('can substitute the same token multiple times in the same input', () => {
        const battleState: BattleOrchestratorState = new BattleOrchestratorState({
            battlePhaseState: {
                currentAffiliation: BattlePhase.UNKNOWN,
                turnCount: 5
            }
        });

        const newText = SubstituteTextUsingBattleOrchestraState(
            "This is turn $$TURN_COUNT. And $$TURN_COUNT is the turn.",
            battleState
        );
        expect(newText).toBe("This is turn 5. And 5 is the turn.");
    });

    it('does not change the input if there are no recognized tags', () => {
        const battleState: BattleOrchestratorState = new BattleOrchestratorState({});

        const newText = SubstituteTextUsingBattleOrchestraState(
            "$$KWYJIBO. Input should be unchanged",
            battleState
        );
        expect(newText).toBe("$$KWYJIBO. Input should be unchanged",);
    });

    it('can substitute Turn Count', () => {
        const battleState: BattleOrchestratorState = new BattleOrchestratorState({
            battlePhaseState: {
                currentAffiliation: BattlePhase.UNKNOWN,
                turnCount: 5
            }
        });

        const newText = SubstituteTextUsingBattleOrchestraState(
            "This is turn $$TURN_COUNT",
            battleState
        );
        expect(newText).toBe("This is turn 5");
    });
});
