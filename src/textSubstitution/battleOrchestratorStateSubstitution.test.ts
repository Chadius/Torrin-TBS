import {BattleOrchestratorState, BattleOrchestratorStateService} from "../battle/orchestrator/battleOrchestratorState";
import {BattlePhase} from "../battle/orchestratorComponents/battlePhaseTracker";
import {SubstituteTextUsingBattleOrchestraState} from "./BattleOrchestratorStateSubstitution";
import {MissionStatisticsHandler} from "../battle/missionStatistics/missionStatistics";
import {BattleStateService} from "../battle/orchestrator/battleState";

describe("BattleOrchestratorStateSubstitution", () => {
    it('can substitute the same token multiple times in the same input', () => {
        const battleState: BattleOrchestratorState = BattleOrchestratorStateService.newOrchestratorState({
            resourceHandler: undefined,
            squaddieRepository: undefined,
            battleSquaddieSelectedHUD: undefined,
            battleState: BattleStateService.newBattleState({
                missionId: "test mission",
                battlePhaseState: {
                    currentAffiliation: BattlePhase.UNKNOWN,
                    turnCount: 5
                }
            })
        });

        const newText = SubstituteTextUsingBattleOrchestraState(
            "This is turn $$TURN_COUNT. And $$TURN_COUNT is the turn.",
            battleState
        );
        expect(newText).toBe("This is turn 5. And 5 is the turn.");
    });

    it('does not change the input if there are no recognized tags', () => {
        const battleState: BattleOrchestratorState = BattleOrchestratorStateService.newOrchestratorState({
            battleState: BattleStateService.newBattleState({
                missionId: "test mission",
            }),
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            squaddieRepository: undefined,
        });

        const newText = SubstituteTextUsingBattleOrchestraState(
            "$$KWYJIBO. Input should be unchanged",
            battleState
        );
        expect(newText).toBe("$$KWYJIBO. Input should be unchanged",);
    });

    it('can substitute Turn Count', () => {
        const battleState: BattleOrchestratorState = BattleOrchestratorStateService.newOrchestratorState({
            battleState: BattleStateService.newBattleState({
                missionId: "test mission",
                battlePhaseState: {
                    currentAffiliation: BattlePhase.UNKNOWN,
                    turnCount: 5
                }
            }),
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            squaddieRepository: undefined,
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
            secondsPassed = (hours * 60 * 60 + minutes * 60 + seconds);

            battleState = BattleOrchestratorStateService.newOrchestratorState({
                resourceHandler: undefined,
                battleSquaddieSelectedHUD: undefined,
                squaddieRepository: undefined,
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    missionStatistics: {
                        ...MissionStatisticsHandler.new(),
                        timeElapsedInMilliseconds: secondsPassed * 1000 + milliseconds,
                    }
                }),
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
            expect(newText).toBe(`How many time has passed? 0${hours}:${minutes}:0${seconds}.057`);
        });
    });

    it('can substitute damage dealt by player team', () => {
        const battleState = BattleOrchestratorStateService.newOrchestratorState({
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            squaddieRepository: undefined,
            battleState: BattleStateService.newBattleState({
                missionId: "test mission",
                missionStatistics: {
                    ...MissionStatisticsHandler.new(),
                    damageDealtByPlayerTeam: 9001,
                }
            }),
        });
        const newText = SubstituteTextUsingBattleOrchestraState(
            "How much damage did the player team deal? $$DAMAGE_DEALT_BY_PLAYER_TEAM",
            battleState
        );
        expect(newText).toBe(`How much damage did the player team deal? 9001`);
    });

    it('can substitute damage received by player team', () => {
        const battleState = BattleOrchestratorStateService.newOrchestratorState({
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            squaddieRepository: undefined,
            battleState: BattleStateService.newBattleState({
                missionId: "test mission",
                missionStatistics: {
                    ...MissionStatisticsHandler.new(),
                    damageTakenByPlayerTeam: 42,
                }
            }),
        });
        const newText = SubstituteTextUsingBattleOrchestraState(
            "How much damage did the player team receive? $$DAMAGE_TAKEN_BY_PLAYER_TEAM",
            battleState
        );
        expect(newText).toBe(`How much damage did the player team receive? 42`);
    });

    it('can substitute healing received by player team', () => {
        const battleState = BattleOrchestratorStateService.newOrchestratorState({
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            squaddieRepository: undefined,
            battleState: BattleStateService.newBattleState({
                missionId: "test mission",
                missionStatistics: {
                    ...MissionStatisticsHandler.new(),
                    healingReceivedByPlayerTeam: 1024,
                }
            }),
        });
        const newText = SubstituteTextUsingBattleOrchestraState(
            "How much healing did the player team receive? $$HEALING_RECEIVED_BY_PLAYER_TEAM",
            battleState
        );
        expect(newText).toBe(`How much healing did the player team receive? 1024`);
    });
});
