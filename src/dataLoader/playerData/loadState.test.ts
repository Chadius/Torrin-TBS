import {
    BattleSaveState,
    BattleSaveStateService,
} from "../../battle/history/battleSaveState"
import { ObjectRepositoryService } from "../../battle/objectRepository"
import { BattleOrchestratorStateService } from "../../battle/orchestrator/battleOrchestratorState"
import { BattleStateService } from "../../battle/battleState/battleState"
import { BattleCamera } from "../../battle/battleCamera"
import { NullMissionMap } from "../../utils/test/battleOrchestratorState"
import { BattlePhase } from "../../battle/orchestratorComponents/battlePhaseTracker"
import { LoadState, LoadSaveStateService } from "./loadState"
import { beforeEach, describe, expect, it } from "vitest"
import {
    ChallengeModifierEnum,
    ChallengeModifierSettingService,
} from "../../battle/challengeModifier/challengeModifierSetting"
import { GameModeEnum } from "../../utils/startupConfig"

describe("LoadState", () => {
    let battleSaveState: BattleSaveState

    beforeEach(() => {
        const challengeModifierSetting = ChallengeModifierSettingService.new()
        ChallengeModifierSettingService.setSetting({
            challengeModifierSetting,
            type: ChallengeModifierEnum.TRAINING_WHEELS,
            value: true,
        })

        battleSaveState =
            BattleSaveStateService.newUsingBattleOrchestratorState({
                missionId: "test",
                campaignId: "test campaign",
                saveVersion: "SAVE_VERSION",
                battleOrchestratorState: BattleOrchestratorStateService.new({
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        campaignId: "test campaign",
                        camera: new BattleCamera(100, 200),
                        missionMap: NullMissionMap(),
                        battlePhaseState: {
                            turnCount: 0,
                            currentAffiliation: BattlePhase.UNKNOWN,
                        },
                        challengeModifierSetting,
                    }),
                }),
                repository: ObjectRepositoryService.new(),
            })
    })

    it("starts with initial fields", () => {
        const loadFlags = LoadSaveStateService.new({})

        expect(loadFlags.userRequestedLoad).toBeFalsy()
        expect(loadFlags.userCanceledLoad).toBeFalsy()
        expect(loadFlags.applicationErroredWhileLoading).toBeFalsy()
        expect(loadFlags.applicationCompletedLoad).toBeFalsy()
        expect(loadFlags.saveState).toBeUndefined()
    })

    describe("can have set fields", () => {
        it("userLoadRequested", () => {
            const loadFlags = LoadSaveStateService.new({
                userRequestedLoad: true,
            })
            expect(loadFlags.userRequestedLoad).toBeTruthy()
        })
        it("applicationErroredWhileLoading", () => {
            const loadFlags = LoadSaveStateService.new({
                applicationErroredWhileLoading: true,
            })
            expect(loadFlags.applicationErroredWhileLoading).toBeTruthy()
        })
        it("userCanceledLoad", () => {
            const loadFlags = LoadSaveStateService.new({
                userCanceledLoad: true,
            })

            expect(loadFlags.userCanceledLoad).toBeTruthy()
        })
        it("applicationCompletedLoad", () => {
            const loadFlags = LoadSaveStateService.new({
                applicationCompletedLoad: true,
            })

            expect(loadFlags.applicationCompletedLoad).toBeTruthy()
        })
        it("saveState", () => {
            const loadFlags = LoadSaveStateService.new({
                saveState: battleSaveState,
            })
            expect(loadFlags.saveState).toEqual(battleSaveState)
        })
    })

    it("knows when the user has requested a loaded file", () => {
        const loadFlags = LoadSaveStateService.new({})
        LoadSaveStateService.userRequestsLoad(loadFlags)
        expect(loadFlags.userRequestedLoad).toBeTruthy()
    })

    it("knows when the user has selected a file and process completed loading save state", () => {
        const loadFlags = LoadSaveStateService.new({
            userRequestedLoad: true,
        })
        LoadSaveStateService.applicationCompletesLoad(
            loadFlags,
            battleSaveState
        )
        expect(loadFlags.applicationCompletedLoad).toBeTruthy()
        expect(loadFlags.saveState).toEqual(battleSaveState)
    })

    it("knows when the user has canceled a file", () => {
        const loadFlags = LoadSaveStateService.new({
            userRequestedLoad: true,
        })
        LoadSaveStateService.userCancelsLoad(loadFlags)
        expect(loadFlags.userCanceledLoad).toBeTruthy()
        expect(loadFlags.userRequestedLoad).toBeFalsy()
        expect(loadFlags.saveState).toBeUndefined()
    })

    it("knows when the process has an error while loading a file", () => {
        const loadFlags = LoadSaveStateService.new({
            userRequestedLoad: true,
        })
        LoadSaveStateService.applicationErrorsWhileLoading(loadFlags)
        expect(loadFlags.applicationErroredWhileLoading).toBeTruthy()
        expect(loadFlags.userRequestedLoad).toBeTruthy()
        expect(loadFlags.saveState).toBeUndefined()
    })

    it("can be reset", () => {
        const loadFlags = LoadSaveStateService.new({
            userRequestedLoad: true,
            applicationErroredWhileLoading: true,
            userCanceledLoad: true,
            applicationCompletedLoad: true,
            saveState: battleSaveState,
        })

        LoadSaveStateService.reset(loadFlags)

        expect(loadFlags.userRequestedLoad).toBeFalsy()
        expect(loadFlags.userCanceledLoad).toBeFalsy()
        expect(loadFlags.applicationErroredWhileLoading).toBeFalsy()
        expect(loadFlags.applicationCompletedLoad).toBeFalsy()
        expect(loadFlags.saveState).toBeUndefined()
    })

    describe("clone", () => {
        let loadFlags: LoadState
        let clone: LoadState
        beforeEach(() => {
            loadFlags = LoadSaveStateService.new({
                userRequestedLoad: true,
                applicationErroredWhileLoading: true,
                userCanceledLoad: true,
                applicationCompletedLoad: true,
                saveState: battleSaveState,
                campaignIdThatWasLoaded: "new campaign id",
                modeThatInitiatedLoading: GameModeEnum.TITLE_SCREEN,
            })

            clone = LoadSaveStateService.clone(loadFlags)
        })
        it("is a different object", () => {
            expect(clone).not.toBe(loadFlags)
        })

        it("userRequestedLoad", () => {
            expect(clone.userRequestedLoad).toEqual(loadFlags.userRequestedLoad)
        })
        it("userCanceledLoad", () => {
            expect(clone.userCanceledLoad).toEqual(loadFlags.userCanceledLoad)
        })
        it("applicationErroredWhileLoading", () => {
            expect(clone.applicationErroredWhileLoading).toEqual(
                loadFlags.applicationErroredWhileLoading
            )
        })
        it("applicationCompletedLoad", () => {
            expect(clone.applicationCompletedLoad).toEqual(
                loadFlags.applicationCompletedLoad
            )
        })
        it("saveState", () => {
            expect(clone.saveState).toEqual(loadFlags.saveState)
        })

        it("campaignIdThatWasLoaded", () => {
            expect(clone.campaignIdThatWasLoaded).toBe(
                loadFlags.campaignIdThatWasLoaded
            )
        })

        it("modeThatInitiatedLoading", () => {
            expect(clone.modeThatInitiatedLoading).toBe(
                loadFlags.modeThatInitiatedLoading
            )
        })
    })
})
