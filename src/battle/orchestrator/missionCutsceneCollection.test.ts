import {Cutscene} from "../../cutscene/cutscene";
import {DialogueBox} from "../../cutscene/dialogue/dialogueBox";
import {DEFAULT_VICTORY_CUTSCENE_ID, MissionCutsceneCollection} from "./missionCutsceneCollection";

describe('MissionCutsceneCollection', () => {
    let dinnerDate: Cutscene;
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
    });

    it('creates a default victory cutscene if it does not exist', () => {
        const cutsceneCollectionWithNoDefaultVictoryCutscene: MissionCutsceneCollection = new MissionCutsceneCollection({cutsceneById: {}});
        expect(DEFAULT_VICTORY_CUTSCENE_ID in cutsceneCollectionWithNoDefaultVictoryCutscene.cutsceneById).toBeTruthy();

        const cutsceneCollectionWithVictoryCutscene: MissionCutsceneCollection = new MissionCutsceneCollection({
            cutsceneById: {
                [DEFAULT_VICTORY_CUTSCENE_ID]: dinnerDate
            }
        });
        expect(DEFAULT_VICTORY_CUTSCENE_ID in cutsceneCollectionWithVictoryCutscene.cutsceneById).toBeTruthy();
    });
});