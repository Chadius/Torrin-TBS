import { BattleOrchestratorStateService } from "../orchestrator/battleOrchestratorState"
import { BattleCutscenePlayer } from "./battleCutscenePlayer"
import { Cutscene, CutsceneService } from "../../cutscene/cutscene"
import { MissionCutsceneCollectionHelper } from "../orchestrator/missionCutsceneCollection"
import { BattleStateService } from "../battleState/battleState"
import { DialogueService } from "../../cutscene/dialogue/dialogue"
import { beforeEach, describe, expect, it } from "vitest"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngineState/gameEngineState"
import { ResourceRepositoryService } from "../../resource/resourceRepository"
import { TestLoadImmediatelyImageLoader } from "../../resource/resourceRepositoryTestUtils"
import { LoadCampaignData } from "../../utils/fileHandling/loadCampaignData"

describe("BattleCutscenePlayer", () => {
    let dinnerDate: Cutscene
    let lunchDate: Cutscene

    const createTestResourceRepository = () => {
        const loadImmediatelyImageLoader = new TestLoadImmediatelyImageLoader({})
        return ResourceRepositoryService.new({
            imageLoader: loadImmediatelyImageLoader,
            urls: Object.fromEntries(
                LoadCampaignData.getResourceKeys().map((key) => [key, "url"])
            ),
        })
    }

    beforeEach(() => {
        dinnerDate = CutsceneService.new({
            directions: [
                DialogueService.new({
                    id: "1",
                    speakerName: "Doorman",
                    dialogueText: "Welcome, come inside",
                    speakerPortraitResourceKey: undefined,
                    animationDuration: 0,
                }),
            ],
        })
        lunchDate = CutsceneService.new({
            directions: [
                DialogueService.new({
                    id: "2",
                    speakerName: "Doorman",
                    dialogueText: "Lunch time!",
                    animationDuration: 0,
                    speakerPortraitResourceKey: undefined,
                }),
            ],
        })
    })

    it("is complete when there is no cutscene to play", () => {
        const cutsceneCollection = MissionCutsceneCollectionHelper.new({
            cutsceneById: {},
        })
        const initialState: GameEngineState = GameEngineStateService.new({
            repository: undefined,
            resourceRepository: createTestResourceRepository(),
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    cutsceneCollection,
                }),
            }),
        })
        const cutscenePlayer: BattleCutscenePlayer = new BattleCutscenePlayer()
        expect(cutscenePlayer.hasCompleted(initialState)).toBeTruthy()
    })
    it("can start a cutscene", () => {
        const cutsceneCollection = MissionCutsceneCollectionHelper.new({
            cutsceneById: {
                dinner_date: dinnerDate,
            },
        })
        const initialState: GameEngineState = GameEngineStateService.new({
            repository: undefined,
            resourceRepository: createTestResourceRepository(),
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    cutsceneCollection,
                }),
            }),
        })

        const cutscenePlayer: BattleCutscenePlayer = new BattleCutscenePlayer()
        cutscenePlayer.startCutscene("dinner_date", initialState)
        expect(cutscenePlayer.currentCutsceneId).toBe("dinner_date")
        expect(cutscenePlayer.currentCutscene).toBe(dinnerDate)
        expect(CutsceneService.isInProgress(dinnerDate)).toBeTruthy()
    })
    it("is complete when the cutscene completes", () => {
        const cutsceneCollection = MissionCutsceneCollectionHelper.new({
            cutsceneById: {
                dinner_date: dinnerDate,
            },
        })
        const initialState: GameEngineState = GameEngineStateService.new({
            repository: undefined,
            resourceRepository: createTestResourceRepository(),
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    cutsceneCollection,
                }),
            }),
        })

        const cutscenePlayer: BattleCutscenePlayer = new BattleCutscenePlayer()
        cutscenePlayer.startCutscene("dinner_date", initialState)
        expect(cutscenePlayer.hasCompleted(initialState)).toBeFalsy()

        CutsceneService.stop(dinnerDate)
        expect(cutscenePlayer.hasCompleted(initialState)).toBeTruthy()
    })
    it("will not change the cutscene if one is playing", () => {
        const cutsceneCollection = MissionCutsceneCollectionHelper.new({
            cutsceneById: {
                dinner_date: dinnerDate,
                lunch_date: lunchDate,
            },
        })
        const initialState: GameEngineState = GameEngineStateService.new({
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    cutsceneCollection,
                }),
            }),
            resourceRepository: createTestResourceRepository(),
        })

        const cutscenePlayer: BattleCutscenePlayer = new BattleCutscenePlayer()
        cutscenePlayer.startCutscene("dinner_date", initialState)
        expect(cutscenePlayer.currentCutsceneId).toBe("dinner_date")
        expect(cutscenePlayer.currentCutscene).toBe(dinnerDate)

        cutscenePlayer.startCutscene("lunch_date", initialState)
        expect(cutscenePlayer.currentCutsceneId).toBe("dinner_date")
        expect(cutscenePlayer.currentCutscene).toBe(dinnerDate)

        CutsceneService.stop(dinnerDate)
        cutscenePlayer.startCutscene("lunch_date", initialState)
        expect(cutscenePlayer.currentCutsceneId).toBe("lunch_date")
        expect(cutscenePlayer.currentCutscene).toBe(lunchDate)
    })
    it("throws an error if the cutscene does not exist", () => {
        const cutsceneCollection = MissionCutsceneCollectionHelper.new({
            cutsceneById: {},
        })

        const cutscenePlayer: BattleCutscenePlayer = new BattleCutscenePlayer()
        const initialState: GameEngineState = GameEngineStateService.new({
            resourceRepository: createTestResourceRepository(),
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    cutsceneCollection,
                }),
            }),
        })

        const shouldThrowError = () => {
            cutscenePlayer.startCutscene("dinner_date", initialState)
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error)
        expect(() => {
            shouldThrowError()
        }).toThrow("No cutscene with Id dinner_date")
    })
    it("clears the current cutscene when it resets", () => {
        const cutsceneCollection = MissionCutsceneCollectionHelper.new({
            cutsceneById: {
                dinner_date: dinnerDate,
            },
        })
        const initialState: GameEngineState = GameEngineStateService.new({
            repository: undefined,
            resourceRepository: createTestResourceRepository(),
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    cutsceneCollection,
                }),
            }),
        })
        const cutscenePlayer: BattleCutscenePlayer = new BattleCutscenePlayer()

        cutscenePlayer.startCutscene("dinner_date", initialState)
        CutsceneService.stop(dinnerDate)
        cutscenePlayer.reset(initialState)
        expect(cutscenePlayer.currentCutscene).toBeUndefined()
    })
})
