import {BattleOrchestratorState, BattleOrchestratorStateService} from "../orchestrator/battleOrchestratorState";
import {BattleCutscenePlayer} from "./battleCutscenePlayer";
import {TODODeleteMeCutscene} from "../../cutscene/cutscene";
import {TODODeleteMeDialogueBoxPlayer} from "../../cutscene/dialogue/dialogueBoxPlayer";
import {MissionCutsceneCollectionHelper} from "../orchestrator/missionCutsceneCollection";
import {BattleStateService} from "../orchestrator/battleState";
import {GameEngineState, GameEngineStateHelper} from "../../gameEngine/gameEngine";
import {DialogueService} from "../../cutscene/dialogue/dialogue";

describe('BattleCutscenePlayer', () => {
    let dinnerDate: TODODeleteMeCutscene;
    let lunchDate: TODODeleteMeCutscene;
    beforeEach(() => {
        dinnerDate = new TODODeleteMeCutscene({
            directions: [
                DialogueService.new({
                    id: "1",
                    speakerName: "Doorman",
                    speakerText: "Welcome, come inside",
                    speakerPortraitResourceKey: undefined,
                    animationDuration: 0
                }),
            ]
        });
        lunchDate = new TODODeleteMeCutscene({
            directions: [
                DialogueService.new({
                    id: "2",
                    speakerName: "Doorman",
                    speakerText: "Lunch time!",
                    animationDuration: 0,
                    speakerPortraitResourceKey: undefined,
                })
            ]
        })
    });

    it('is complete when there is no cutscene to play', () => {
        const cutsceneCollection = MissionCutsceneCollectionHelper.new({cutsceneById: {}});
        const initialState: GameEngineState = GameEngineStateHelper.new({
            battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                squaddieRepository: undefined,
                battleSquaddieSelectedHUD: undefined,
                resourceHandler: undefined,
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    cutsceneCollection
                })
            })
        });
        const cutscenePlayer: BattleCutscenePlayer = new BattleCutscenePlayer();
        expect(cutscenePlayer.hasCompleted(initialState)).toBeTruthy();
    });
    it('can start a cutscene', () => {
        const cutsceneCollection = MissionCutsceneCollectionHelper.new({
            cutsceneById: {
                "dinner_date": dinnerDate,
            }
        });
        const initialState: GameEngineState = GameEngineStateHelper.new({
            battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                squaddieRepository: undefined,
                battleSquaddieSelectedHUD: undefined,
                resourceHandler: undefined,
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    cutsceneCollection
                })
            })
        });

        const cutscenePlayer: BattleCutscenePlayer = new BattleCutscenePlayer();
        cutscenePlayer.startCutscene("dinner_date", initialState.battleOrchestratorState);
        expect(cutscenePlayer.currentCutsceneId).toBe("dinner_date");
        expect(cutscenePlayer.currentCutscene).toBe(dinnerDate);
        expect(dinnerDate.isInProgress()).toBeTruthy();
    });
    it('is complete when the cutscene completes', () => {
        const cutsceneCollection = MissionCutsceneCollectionHelper.new({
            cutsceneById: {
                "dinner_date": dinnerDate,
            }
        });
        const initialState: GameEngineState = GameEngineStateHelper.new({
            battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                squaddieRepository: undefined,
                battleSquaddieSelectedHUD: undefined,
                resourceHandler: undefined,
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    cutsceneCollection
                })
            })
        });

        const cutscenePlayer: BattleCutscenePlayer = new BattleCutscenePlayer();
        cutscenePlayer.startCutscene("dinner_date", initialState.battleOrchestratorState);
        expect(cutscenePlayer.hasCompleted(initialState)).toBeFalsy();

        dinnerDate.stop();
        expect(cutscenePlayer.hasCompleted(initialState)).toBeTruthy();
    });
    it('will not change the cutscene if one is playing', () => {
        const cutsceneCollection = MissionCutsceneCollectionHelper.new({
            cutsceneById: {
                "dinner_date": dinnerDate,
                "lunch_date": lunchDate,
            }
        });
        const initialState: BattleOrchestratorState = BattleOrchestratorStateService.newOrchestratorState({
            squaddieRepository: undefined,
            battleSquaddieSelectedHUD: undefined,
            resourceHandler: undefined,
            battleState: BattleStateService.newBattleState({
                missionId: "test mission",
                cutsceneCollection
            })
        });

        const cutscenePlayer: BattleCutscenePlayer = new BattleCutscenePlayer();
        cutscenePlayer.startCutscene("dinner_date", initialState);
        expect(cutscenePlayer.currentCutsceneId).toBe("dinner_date");
        expect(cutscenePlayer.currentCutscene).toBe(dinnerDate);

        cutscenePlayer.startCutscene("lunch_date", initialState);
        expect(cutscenePlayer.currentCutsceneId).toBe("dinner_date");
        expect(cutscenePlayer.currentCutscene).toBe(dinnerDate);

        dinnerDate.stop();
        cutscenePlayer.startCutscene("lunch_date", initialState);
        expect(cutscenePlayer.currentCutsceneId).toBe("lunch_date");
        expect(cutscenePlayer.currentCutscene).toBe(lunchDate);
    });
    it('throws an error if the cutscene does not exist', () => {
        const cutsceneCollection = MissionCutsceneCollectionHelper.new({
            cutsceneById: {}
        });

        const cutscenePlayer: BattleCutscenePlayer = new BattleCutscenePlayer();
        const initialState: BattleOrchestratorState = BattleOrchestratorStateService.newOrchestratorState({
            squaddieRepository: undefined,
            battleSquaddieSelectedHUD: undefined,
            resourceHandler: undefined,
            battleState: BattleStateService.newBattleState({
                missionId: "test mission",
                cutsceneCollection
            })
        });

        const shouldThrowError = () => {
            cutscenePlayer.startCutscene("dinner_date", initialState);
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error);
        expect(() => {
            shouldThrowError()
        }).toThrow("No cutscene with Id dinner_date");
    });
    it('clears the current cutscene when it resets', () => {
        const cutsceneCollection = MissionCutsceneCollectionHelper.new({
            cutsceneById: {
                "dinner_date": dinnerDate,
            }
        });
        const initialState: GameEngineState = GameEngineStateHelper.new({
            battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                squaddieRepository: undefined,
                battleSquaddieSelectedHUD: undefined,
                resourceHandler: undefined,
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    cutsceneCollection
                })
            })
        });
        const cutscenePlayer: BattleCutscenePlayer = new BattleCutscenePlayer();

        cutscenePlayer.startCutscene("dinner_date", initialState.battleOrchestratorState);
        dinnerDate.stop();
        cutscenePlayer.reset(initialState);
        expect(cutscenePlayer.currentCutscene).toBeUndefined();
    });
});
