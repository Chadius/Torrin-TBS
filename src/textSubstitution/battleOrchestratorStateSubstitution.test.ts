import {BattleOrchestratorState} from "../battle/orchestrator/battleOrchestratorState";
import {BattlePhase} from "../battle/orchestratorComponents/battlePhaseTracker";
import {SubstituteTextUsingBattleOrchestraState} from "./BattleOrchestratorStateSubstitution";
import {MissionStatistics} from "../battle/missionStatistics/missionStatistics";

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

    describe('can substitute time elapsed in milliseconds', () => {
        let battleState: BattleOrchestratorState;
        const hours = 3;
        const minutes = 23;
        const seconds = 6;
        const milliseconds = 57;
        let secondsPassed: number;

        beforeEach(() => {
            secondsPassed =  (hours * 60 * 60 + minutes * 60 + seconds);

            battleState = new BattleOrchestratorState({
                missionStatistics: new MissionStatistics({
                    timeElapsedInMilliseconds: secondsPassed * 1000 + milliseconds,
                })
            });
        });

        it('can substitute time elapsed in milliseconds', () => {
            const newText = SubstituteTextUsingBattleOrchestraState(
                "How many milliseconds have passed? $$TIME_ELAPSED_IN_MILLISECONDS",
                battleState
            );
            expect(newText).toBe(`How many milliseconds have passed? ${secondsPassed}057`);
        });

        it('can substitute time elapsed in hours:minutes:seconds', () => {
            const newText = SubstituteTextUsingBattleOrchestraState(
                "How many time has passed? $$TIME_ELAPSED",
                battleState
            );
            expect(newText).toBe(`How many time has passed? 0${hours}:${minutes}:${seconds}.057`);
        });
    });
});
