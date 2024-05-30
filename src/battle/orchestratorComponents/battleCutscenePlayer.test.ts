import { BattleOrchestratorStateService } from "../orchestrator/battleOrchestratorState"
import { BattleCutscenePlayer } from "./battleCutscenePlayer"
import { Cutscene, CutsceneService } from "../../cutscene/cutscene"
import { MissionCutsceneCollectionHelper } from "../orchestrator/missionCutsceneCollection"
import { BattleStateService } from "../orchestrator/battleState"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngine"
import { DialogueService } from "../../cutscene/dialogue/dialogue"

describe("BattleCutscenePlayer", () => {
    let dinnerDate: Cutscene
    let lunchDate: Cutscene
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
        lunchDate = CutsceneService.new({
            directions: [
                DialogueService.new({
                    id: "2",
                    speakerName: "Doorman",
                    speakerText: "Lunch time!",
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
            resourceHandler: undefined,
            battleOrchestratorState:
                BattleOrchestratorStateService.newOrchestratorState({
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
            resourceHandler: undefined,
            battleOrchestratorState:
                BattleOrchestratorStateService.newOrchestratorState({
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
            resourceHandler: undefined,
            battleOrchestratorState:
                BattleOrchestratorStateService.newOrchestratorState({
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
            battleOrchestratorState:
                BattleOrchestratorStateService.newOrchestratorState({
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        campaignId: "test campaign",
                        cutsceneCollection,
                    }),
                }),
            resourceHandler: undefined,
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
            resourceHandler: undefined,
            battleOrchestratorState:
                BattleOrchestratorStateService.newOrchestratorState({
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
            resourceHandler: undefined,
            battleOrchestratorState:
                BattleOrchestratorStateService.newOrchestratorState({
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
