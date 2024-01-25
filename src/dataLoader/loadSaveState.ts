import {BattleSaveState} from "../battle/history/battleSaveState";
import {isValidValue} from "../utils/validityCheck";

export interface LoadSaveState {
    saveState: BattleSaveState;
    applicationStartedLoad: boolean;
    applicationCompletedLoad: boolean;
    userRequestedLoad: boolean;
    userCanceledLoad: boolean;
    applicationErroredWhileLoading: boolean;
    locks: {};
}

export const LoadSaveStateService = {
    new: ({
              saveState,
              processStartedLoad,
              processErroredWhileLoading,
              processCompletedLoad,
              userLoadRequested,
              userCanceledLoad
          }: {
        saveState?: BattleSaveState;
        processStartedLoad?: boolean;
        processErroredWhileLoading?: boolean;
        processCompletedLoad?: boolean;
        userLoadRequested?: boolean;
        userCanceledLoad?: boolean
    }): LoadSaveState => {
        return newLoadSaveState({
            saveState: isValidValue(saveState) ? saveState : undefined,
            processStartedLoad: isValidValue(processStartedLoad) ? processStartedLoad : false,
            processErroredWhileLoading: isValidValue(processErroredWhileLoading) ? processStartedLoad : false,
            processCompletedLoad: isValidValue(processCompletedLoad) ? processStartedLoad : false,
            userLoadRequested: isValidValue(userLoadRequested) ? processStartedLoad : false,
            userCanceledLoad: isValidValue(userCanceledLoad) ? processStartedLoad : false,
        });
    },
    userRequestsLoad: (loadSaveState: LoadSaveState): void => {
        loadSaveState.userRequestedLoad = true;
    },
    applicationStartsLoad: (loadSaveState: LoadSaveState): void => {
        loadSaveState.applicationStartedLoad = true;
    },
    applicationCompletesLoad: (loadSaveState: LoadSaveState, saveSate: BattleSaveState): void => {
        loadSaveState.applicationCompletedLoad = true;
        loadSaveState.saveState = saveSate;
    },
    applicationErrorsWhileLoading: (loadSaveState: LoadSaveState): void => {
        loadSaveState.applicationErroredWhileLoading = true;
        loadSaveState.saveState = undefined;
    },
    userCancelsLoad: (loadSaveState: LoadSaveState): void => {
        loadSaveState.userCanceledLoad = true;
        loadSaveState.saveState = undefined;
    },
    reset: (loadSaveState: LoadSaveState): void => {
        Object.assign(
            loadSaveState,
            newLoadSaveState({
                saveState: undefined,
                processStartedLoad: false,
                processErroredWhileLoading: false,
                processCompletedLoad: false,
                userLoadRequested: false,
                userCanceledLoad: false,
            })
        );
    },
}

const newLoadSaveState = ({
                              saveState,
                              processStartedLoad,
                              processErroredWhileLoading,
                              processCompletedLoad,
                              userLoadRequested,
                              userCanceledLoad
                          }: {
    saveState: BattleSaveState;
    processStartedLoad: boolean;
    processErroredWhileLoading: boolean;
    processCompletedLoad: boolean;
    userLoadRequested: boolean;
    userCanceledLoad: boolean
}): LoadSaveState => {
    return {
        saveState,
        applicationStartedLoad: processStartedLoad,
        applicationErroredWhileLoading: processErroredWhileLoading,
        applicationCompletedLoad: processCompletedLoad,
        userRequestedLoad: userLoadRequested,
        userCanceledLoad,
        locks: {},
    }
}
