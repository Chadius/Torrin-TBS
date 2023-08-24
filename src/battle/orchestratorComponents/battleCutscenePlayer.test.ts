import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {BattleCutscenePlayer} from "./battleCutscenePlayer";
import {Cutscene} from "../../cutscene/cutscene";
import {DialogueBox} from "../../cutscene/dialogue/dialogueBox";

describe('BattleCutscenePlayer', () => {
    let dinnerDate: Cutscene;
    let lunchDate: Cutscene;
    beforeEach(() => {
        const frontDoorGreeting = new DialogueBox({
            id: "1",
            name: "Doorman",
            text: "Welcome, come inside",
            animationDuration: 0
        });
        dinnerDate = new Cutscene({
            actions: [
                frontDoorGreeting
            ]
        });
        lunchDate = new Cutscene({
            actions: [
                new DialogueBox({
                    id: "2",
                    name: "Doorman",
                    text: "Lunch time!",
                    animationDuration: 0
                })
            ]
        })
    });

    it('is complete when there is no cutscene to play', () => {
        const initialState: BattleOrchestratorState = new BattleOrchestratorState({});
        const cutscenePlayer: BattleCutscenePlayer = new BattleCutscenePlayer({cutsceneById: {}});
        expect(cutscenePlayer.hasCompleted(initialState)).toBeTruthy();
    });
    it('can start a cutscene', () => {
        const cutscenePlayer: BattleCutscenePlayer = new BattleCutscenePlayer({
            cutsceneById: {
                "dinner_date": dinnerDate,
            }
        });
        cutscenePlayer.startCutscene("dinner_date");
        expect(cutscenePlayer.currentCutsceneId).toBe("dinner_date");
        expect(cutscenePlayer.currentCutscene).toBe(dinnerDate);
        expect(dinnerDate.isInProgress()).toBeTruthy();
    });
    it('is complete when the cutscene completes', () => {
        const initialState: BattleOrchestratorState = new BattleOrchestratorState({});
        const cutscenePlayer: BattleCutscenePlayer = new BattleCutscenePlayer({
            cutsceneById: {
                "dinner_date": dinnerDate,
            }
        });
        cutscenePlayer.startCutscene("dinner_date");
        expect(cutscenePlayer.hasCompleted(initialState)).toBeFalsy();

        dinnerDate.stop();
        expect(cutscenePlayer.hasCompleted(initialState)).toBeTruthy();
    });
    it('will not change the cutscene if one is playing', () => {
        const cutscenePlayer: BattleCutscenePlayer = new BattleCutscenePlayer({
            cutsceneById: {
                "dinner_date": dinnerDate,
                "lunch_date": lunchDate,
            }
        });
        cutscenePlayer.startCutscene("dinner_date");
        expect(cutscenePlayer.currentCutsceneId).toBe("dinner_date");
        expect(cutscenePlayer.currentCutscene).toBe(dinnerDate);

        cutscenePlayer.startCutscene("lunch_date");
        expect(cutscenePlayer.currentCutsceneId).toBe("dinner_date");
        expect(cutscenePlayer.currentCutscene).toBe(dinnerDate);

        dinnerDate.stop();
        cutscenePlayer.startCutscene("lunch_date");
        expect(cutscenePlayer.currentCutsceneId).toBe("lunch_date");
        expect(cutscenePlayer.currentCutscene).toBe(lunchDate);
    });
    it('throws an error if the cutscene does not exist', () => {
        const cutscenePlayer: BattleCutscenePlayer = new BattleCutscenePlayer({cutsceneById: {}});

        const shouldThrowError = () => {
            cutscenePlayer.startCutscene("dinner_date");
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error);
        expect(() => {
            shouldThrowError()
        }).toThrow("No cutscene with Id dinner_date");
    });
    it('clears the current cutscene when it resets', () => {
        const initialState: BattleOrchestratorState = new BattleOrchestratorState({});
        const cutscenePlayer: BattleCutscenePlayer = new BattleCutscenePlayer({
            cutsceneById: {
                "dinner_date": dinnerDate,
            }
        });
        cutscenePlayer.startCutscene("dinner_date");
        dinnerDate.stop();
        cutscenePlayer.reset(initialState);
        expect(cutscenePlayer.currentCutscene).toBeUndefined();
    });
});
