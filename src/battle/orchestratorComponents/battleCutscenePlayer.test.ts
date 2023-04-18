import {OrchestratorState} from "../orchestrator/orchestratorState";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {BattleCutscenePlayer} from "./battleCutscenePlayer";
import {Cutscene} from "../../cutscene/cutscene";
import {DialogueBox} from "../../cutscene/dialogue/dialogueBox";

describe('BattleCutscenePlayer', () => {
    it('is complete when there is no cutscene to play', () => {
        const initialState: OrchestratorState = new OrchestratorState({
            squaddieRepo: new BattleSquaddieRepository(),
            currentCutscene: undefined,
        });
        const cutscenePlayer: BattleCutscenePlayer = new BattleCutscenePlayer();
        expect(cutscenePlayer.hasCompleted(initialState)).toBeTruthy();
    });
    it('is complete when the cutscene completes', () => {
        const frontDoorGreeting = new DialogueBox({
            id: "1",
            name: "Doorman",
            text: "Welcome, come inside",
            animationDuration: 0
        });
        const dinnerDate = new Cutscene({
            actions: [
                frontDoorGreeting
            ]
        });
        const initialState: OrchestratorState = new OrchestratorState({
            squaddieRepo: new BattleSquaddieRepository(),
            currentCutscene: dinnerDate,
        });
        const cutscenePlayer: BattleCutscenePlayer = new BattleCutscenePlayer();

        dinnerDate.start();
        expect(cutscenePlayer.hasCompleted(initialState)).toBeFalsy();

        dinnerDate.stop();
        expect(cutscenePlayer.hasCompleted(initialState)).toBeTruthy();
    });
});