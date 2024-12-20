import {
    BattleSaveState,
    BattleSaveStateService,
} from "../battle/history/battleSaveState"
import { ObjectRepositoryService } from "../battle/objectRepository"
import { BattleOrchestratorStateService } from "../battle/orchestrator/battleOrchestratorState"
import { BattleStateService } from "../battle/orchestrator/battleState"
import { BattleCamera } from "../battle/battleCamera"
import { NullMissionMap } from "../utils/test/battleOrchestratorState"
import { BattlePhase } from "../battle/orchestratorComponents/battlePhaseTracker"
import { LoadSaveState, LoadSaveStateService } from "./loadSaveState"
import { beforeEach, describe, expect, it } from "vitest"

describe("Load SaveState", () => {
    let saveState: BattleSaveState

    beforeEach(() => {
        saveState = BattleSaveStateService.newUsingBattleOrchestratorState({
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
                }),
            }),
            repository: ObjectRepositoryService.new(),
        })
    })

    it("starts with initial fields", () => {
        const loadFlags = LoadSaveStateService.new({})

        expect(loadFlags.userRequestedLoad).toBeFalsy()
        expect(loadFlags.applicationStartedLoad).toBeFalsy()
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
        it("applicationStartedLoad", () => {
            const loadFlags = LoadSaveStateService.new({
                applicationStartedLoad: true,
            })

            expect(loadFlags.applicationStartedLoad).toBeTruthy()
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
                saveState: saveState,
            })
            expect(loadFlags.saveState).toEqual(saveState)
        })
    })

    it("knows when the user has requested a loaded file", () => {
        const loadFlags = LoadSaveStateService.new({})
        LoadSaveStateService.userRequestsLoad(loadFlags)
        expect(loadFlags.userRequestedLoad).toBeTruthy()
    })

    it("knows when the application has started loading", () => {
        const loadFlags = LoadSaveStateService.new({})
        LoadSaveStateService.applicationStartsLoad(loadFlags)
        expect(loadFlags.applicationStartedLoad).toBeTruthy()
    })

    it("knows when the user has selected a file and process completed loading save state", () => {
        const loadFlags = LoadSaveStateService.new({
            userRequestedLoad: true,
            applicationStartedLoad: true,
        })
        LoadSaveStateService.applicationCompletesLoad(loadFlags, saveState)
        expect(loadFlags.applicationCompletedLoad).toBeTruthy()
        expect(loadFlags.applicationStartedLoad).toBeFalsy()
        expect(loadFlags.saveState).toEqual(saveState)
    })

    it("knows when the user has canceled a file", () => {
        const loadFlags = LoadSaveStateService.new({
            userRequestedLoad: true,
        })
        LoadSaveStateService.userCancelsLoad(loadFlags)
        expect(loadFlags.userCanceledLoad).toBeTruthy()
        expect(loadFlags.userRequestedLoad).toBeFalsy()
        expect(loadFlags.applicationStartedLoad).toBeFalsy()
        expect(loadFlags.saveState).toBeUndefined()
    })

    it("knows when the process has an error while loading a file", () => {
        const loadFlags = LoadSaveStateService.new({
            userRequestedLoad: true,
        })
        LoadSaveStateService.applicationErrorsWhileLoading(loadFlags)
        expect(loadFlags.applicationErroredWhileLoading).toBeTruthy()
        expect(loadFlags.applicationStartedLoad).toBeFalsy()
        expect(loadFlags.userRequestedLoad).toBeTruthy()
        expect(loadFlags.saveState).toBeUndefined()
    })

    it("can be reset", () => {
        const loadFlags = LoadSaveStateService.new({
            userRequestedLoad: true,
            applicationErroredWhileLoading: true,
            applicationStartedLoad: true,
            userCanceledLoad: true,
            applicationCompletedLoad: true,
            saveState: saveState,
        })

        LoadSaveStateService.reset(loadFlags)

        expect(loadFlags.userRequestedLoad).toBeFalsy()
        expect(loadFlags.applicationStartedLoad).toBeFalsy()
        expect(loadFlags.userCanceledLoad).toBeFalsy()
        expect(loadFlags.applicationErroredWhileLoading).toBeFalsy()
        expect(loadFlags.applicationCompletedLoad).toBeFalsy()
        expect(loadFlags.saveState).toBeUndefined()
    })

    it("can be cloned", () => {
        const loadFlags = LoadSaveStateService.new({
            userRequestedLoad: true,
            applicationErroredWhileLoading: true,
            applicationStartedLoad: true,
            userCanceledLoad: true,
            applicationCompletedLoad: true,
            saveState: saveState,
        })

        const clone: LoadSaveState = LoadSaveStateService.clone(loadFlags)

        expect(clone.userRequestedLoad).toEqual(loadFlags.userRequestedLoad)
        expect(clone.applicationStartedLoad).toEqual(
            loadFlags.applicationStartedLoad
        )
        expect(clone.userCanceledLoad).toEqual(loadFlags.userCanceledLoad)
        expect(clone.applicationErroredWhileLoading).toEqual(
            loadFlags.applicationErroredWhileLoading
        )
        expect(clone.applicationCompletedLoad).toEqual(
            loadFlags.applicationCompletedLoad
        )
        expect(clone.saveState).toEqual(loadFlags.saveState)
    })
})
