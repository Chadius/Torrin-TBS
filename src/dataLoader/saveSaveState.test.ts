import {SaveSaveState, SaveSaveStateService} from "./saveSaveState";

describe('Save SaveState', () => {
    beforeEach(() => {
    });

    it('can be initialized with defaults', () => {
        const saveSaveState: SaveSaveState = SaveSaveStateService.new({});

        expect(saveSaveState.savingInProgress).toEqual(false);
        expect(saveSaveState.errorDuringSaving).toEqual(false);
    });

    describe('can be initialized with given values', () => {
        it('savingInProgress', () => {
            const saveSaveState: SaveSaveState = SaveSaveStateService.new({
                savingInProgress: true
            });

            expect(saveSaveState.savingInProgress).toEqual(true);
        });
        it('errorDuringSaving', () => {
            const saveSaveState: SaveSaveState = SaveSaveStateService.new({
                errorDuringSaving: true,
            });

            expect(saveSaveState.errorDuringSaving).toEqual(true);
        });
    });

    it('knows when the user begins saving', () => {
        const saveSaveState: SaveSaveState = SaveSaveStateService.new({});
        SaveSaveStateService.userRequestsSave(saveSaveState);
        expect(saveSaveState.userRequestedSave).toBeTruthy();
        expect(saveSaveState.savingInProgress).toBeTruthy();
        expect(saveSaveState.errorDuringSaving).toBeFalsy();
    });
    describe('save is successful', () => {
        let saveSaveState: SaveSaveState
        beforeEach(() => {
            saveSaveState = SaveSaveStateService.new({});
            SaveSaveStateService.userRequestsSave(saveSaveState);
            SaveSaveStateService.savingAttemptIsComplete(saveSaveState);
        });
        it('knows when saving is complete', () => {
            expect(saveSaveState.userRequestedSave).toBeTruthy();
            expect(saveSaveState.savingInProgress).toBeFalsy();
            expect(saveSaveState.errorDuringSaving).toBeFalsy();
        });
        it('knows it is now appropriate to clear the user request', () => {
            expect(SaveSaveStateService.didUserRequestSaveAndSaveHasConcluded(saveSaveState)).toBeTruthy();
            SaveSaveStateService.userFinishesRequestingSave(saveSaveState);
            expect(saveSaveState.userRequestedSave).toBeFalsy();
        });
    });

    describe('save fails due to an error', () => {
        let saveSaveState: SaveSaveState
        beforeEach(() => {
            saveSaveState = SaveSaveStateService.new({});
            SaveSaveStateService.userRequestsSave(saveSaveState);
            SaveSaveStateService.foundErrorDuringSaving(saveSaveState);
        });
        it('knows when an error was found during saving', () => {
            expect(saveSaveState.userRequestedSave).toBeTruthy();
            expect(saveSaveState.savingInProgress).toBeFalsy();
            expect(saveSaveState.errorDuringSaving).toBeTruthy();
        });
        it('knows it is now appropriate to clear the user request', () => {
            expect(SaveSaveStateService.didUserRequestSaveAndSaveHasConcluded(saveSaveState)).toBeTruthy();
            SaveSaveStateService.userFinishesRequestingSave(saveSaveState);
            expect(saveSaveState.userRequestedSave).toBeFalsy();
        });
    });

    it('can be reset to default values', () => {
        const saveSaveState: SaveSaveState = SaveSaveStateService.new({
            savingInProgress: true,
            errorDuringSaving: true,
        });

        SaveSaveStateService.reset(saveSaveState);

        expect(saveSaveState.savingInProgress).toEqual(false);
        expect(saveSaveState.errorDuringSaving).toEqual(false);
    });

    it('can be cloned', () => {
        const saveSaveState: SaveSaveState = SaveSaveStateService.new({
            savingInProgress: true,
            errorDuringSaving: true,
        });

        const clone: SaveSaveState = SaveSaveStateService.clone(saveSaveState);

        expect(clone.userRequestedSave).toEqual(saveSaveState.userRequestedSave);
        expect(clone.savingInProgress).toEqual(saveSaveState.savingInProgress);
        expect(clone.errorDuringSaving).toEqual(saveSaveState.errorDuringSaving);
    });
});
