import {BattleSaveState, BattleSaveStateService} from "../battle/history/battleSaveState";
import {SAVE_VERSION} from "../utils/fileHandling/saveFile";
import {ObjectRepositoryService} from "../battle/objectRepository";
import {BattleOrchestratorStateService} from "../battle/orchestrator/battleOrchestratorState";
import {BattleStateService} from "../battle/orchestrator/battleState";
import {BattleCamera} from "../battle/battleCamera";
import {NullMissionMap} from "../utils/test/battleOrchestratorState";
import {BattlePhase} from "../battle/orchestratorComponents/battlePhaseTracker";
import {LoadSaveStateService} from "./loadSaveState";

describe('Load Save State Process', () => {
    let saveState: BattleSaveState;

    beforeEach(() => {
        saveState = BattleSaveStateService.newUsingBattleOrchestratorState({
            missionId: "test",
            saveVersion: SAVE_VERSION,
            battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                battleSquaddieSelectedHUD: undefined,
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    camera: new BattleCamera(100, 200),
                    missionMap: NullMissionMap(),
                    battlePhaseState: {
                        turnCount: 0,
                        currentAffiliation: BattlePhase.UNKNOWN,
                    },
                }),
            }),
            repository: ObjectRepositoryService.new(),
        });
    })

    it('starts with initial fields', () => {
        const loadFlags = LoadSaveStateService.new({});

        expect(loadFlags.userRequestedLoad).toBeFalsy();
        expect(loadFlags.applicationStartedLoad).toBeFalsy();
        expect(loadFlags.userCanceledLoad).toBeFalsy();
        expect(loadFlags.applicationErroredWhileLoading).toBeFalsy();
        expect(loadFlags.applicationCompletedLoad).toBeFalsy();
        expect(loadFlags.saveState).toBeUndefined();
    });

    it('knows when the user has requested a loaded file', () => {
        const loadFlags = LoadSaveStateService.new({});
        LoadSaveStateService.userRequestsLoad(loadFlags);
        expect(loadFlags.userRequestedLoad).toBeTruthy();
    });

    it('knows when the application has started loading', () => {
        const loadFlags = LoadSaveStateService.new({});
        LoadSaveStateService.applicationStartsLoad(loadFlags);
        expect(loadFlags.applicationStartedLoad).toBeTruthy();
    });

    it('knows when the user has selected a file and process completed loading save state', () => {
        const loadFlags = LoadSaveStateService.new({
            applicationStartedLoad: true
        });
        LoadSaveStateService.applicationCompletesLoad(loadFlags, saveState);
        expect(loadFlags.applicationCompletedLoad).toBeTruthy();
        expect(loadFlags.applicationStartedLoad).toBeFalsy();
        expect(loadFlags.saveState).toEqual(saveState);
    });

    it('knows when the user has canceled a file', () => {
        const loadFlags = LoadSaveStateService.new({});
        LoadSaveStateService.userCancelsLoad(loadFlags);
        expect(loadFlags.userCanceledLoad).toBeTruthy();
        expect(loadFlags.userRequestedLoad).toBeFalsy();
        expect(loadFlags.applicationStartedLoad).toBeFalsy();
        expect(loadFlags.saveState).toBeUndefined();
    });

    it('knows when the process has an error while loading a file', () => {
        const loadFlags = LoadSaveStateService.new({});
        LoadSaveStateService.applicationErrorsWhileLoading(loadFlags);
        expect(loadFlags.applicationErroredWhileLoading).toBeTruthy();
        expect(loadFlags.applicationStartedLoad).toBeFalsy();
        expect(loadFlags.userRequestedLoad).toBeFalsy();
        expect(loadFlags.saveState).toBeUndefined();
    });

    it('can be reset', () => {
        const loadFlags = LoadSaveStateService.new({
            userLoadRequested: true,
            applicationErroredWhileLoading: true,
            applicationStartedLoad: true,
            userCanceledLoad: true,
            applicationCompletedLoad: true,
            saveState: saveState,
        });

        LoadSaveStateService.reset(loadFlags);

        expect(loadFlags.userRequestedLoad).toBeFalsy();
        expect(loadFlags.applicationStartedLoad).toBeFalsy();
        expect(loadFlags.userCanceledLoad).toBeFalsy();
        expect(loadFlags.applicationErroredWhileLoading).toBeFalsy();
        expect(loadFlags.applicationCompletedLoad).toBeFalsy();
        expect(loadFlags.saveState).toBeUndefined();
    });
})
