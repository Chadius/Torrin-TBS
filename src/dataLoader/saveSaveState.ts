import {getValidValueOrDefault} from "../utils/validityCheck";

export interface SaveSaveState {
    errorDuringSaving: boolean;
    savingInProgress: boolean;
}

export const SaveSaveStateService = {
    new: ({
              errorDuringSaving,
              savingInProgress,
          }: {
        errorDuringSaving?: boolean,
        savingInProgress?: boolean,
    }): SaveSaveState => {
        return newSaveSaveState({
            errorDuringSaving,
            savingInProgress,
        });
    },
    foundErrorDuringSaving: (saveSaveState: SaveSaveState) => {
        saveSaveState.savingInProgress = false;
        saveSaveState.errorDuringSaving = true;
    },
    userRequestsSave: (saveSaveState: SaveSaveState) => {
        saveSaveState.savingInProgress = true;
    },
    savingAttemptIsComplete: (saveSaveState: SaveSaveState) => {
        saveSaveState.savingInProgress = false;
    },
    reset: (saveSaveState: SaveSaveState) => {
        Object.assign(saveSaveState, newSaveSaveState({}));
    },
    clone: (saveSaveState: SaveSaveState): SaveSaveState => {
        return newSaveSaveState({...saveSaveState});
    },
}

const newSaveSaveState = ({
                              errorDuringSaving,
                              savingInProgress,
                          }: {
    errorDuringSaving?: boolean,
    savingInProgress?: boolean,
}): SaveSaveState => {
    return sanitize({
        errorDuringSaving,
        savingInProgress,
    });
}

const sanitize = (saveSaveState: SaveSaveState): SaveSaveState => {
    saveSaveState.errorDuringSaving = getValidValueOrDefault(saveSaveState.errorDuringSaving, false);
    saveSaveState.savingInProgress = getValidValueOrDefault(saveSaveState.savingInProgress, false);
    return saveSaveState;
}
