import { Cutscene, CutsceneService } from "../../cutscene/cutscene"
import {
    DEFAULT_VICTORY_CUTSCENE_ID,
    MissionCutsceneCollection,
    MissionCutsceneCollectionHelper,
} from "./missionCutsceneCollection"
import { DialogueService } from "../../cutscene/dialogue/dialogue"

describe("MissionCutsceneCollection", () => {
    let dinnerDate: Cutscene
    beforeEach(() => {
        dinnerDate = CutsceneService.new({
            directions: [
                DialogueService.new({
                    id: "1",
                    speakerName: "Doorman",
                    speakerText: "Welcome, come inside",
                    speakerPortraitResourceKey: undefined,
                    animationDuration: 0,
                }),
            ],
        })
    })

    it("creates a default victory cutscene if it does not exist", () => {
        const cutsceneCollectionWithNoDefaultVictoryCutscene: MissionCutsceneCollection =
            MissionCutsceneCollectionHelper.new({ cutsceneById: {} })
        expect(
            DEFAULT_VICTORY_CUTSCENE_ID in
                cutsceneCollectionWithNoDefaultVictoryCutscene.cutsceneById
        ).toBeTruthy()

        const cutsceneCollectionWithVictoryCutscene: MissionCutsceneCollection =
            MissionCutsceneCollectionHelper.new({
                cutsceneById: {
                    [DEFAULT_VICTORY_CUTSCENE_ID]: dinnerDate,
                },
            })
        expect(
            DEFAULT_VICTORY_CUTSCENE_ID in
                cutsceneCollectionWithVictoryCutscene.cutsceneById
        ).toBeTruthy()
    })
})
