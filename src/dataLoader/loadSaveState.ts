import {BattleSaveState} from "../battle/history/battleSaveState";
import {isValidValue} from "../utils/validityCheck";

export interface LoadSaveState {
    saveState: BattleSaveState;
    applicationStartedLoad: boolean;
    applicationCompletedLoad: boolean;
    userRequestedLoad: boolean;
    userCanceledLoad: boolean;
    applicationErroredWhileLoading: boolean;
}

export const LoadSaveStateService = {
    new: ({
              saveState,
              applicationStartedLoad,
              applicationErroredWhileLoading,
              applicationCompletedLoad,
              userLoadRequested,
              userCanceledLoad
          }: {
        saveState?: BattleSaveState;
        applicationStartedLoad?: boolean;
        applicationErroredWhileLoading?: boolean;
        applicationCompletedLoad?: boolean;
        userLoadRequested?: boolean;
        userCanceledLoad?: boolean
    }): LoadSaveState => {
        return newLoadSaveState({
            saveState: isValidValue(saveState) ? saveState : undefined,
            applicationStartedLoad: isValidValue(applicationStartedLoad) ? applicationStartedLoad : false,
            applicationErroredWhileLoading: isValidValue(applicationErroredWhileLoading) ? applicationStartedLoad : false,
            applicationCompletedLoad: isValidValue(applicationCompletedLoad) ? applicationStartedLoad : false,
            userLoadRequested: isValidValue(userLoadRequested) ? applicationStartedLoad : false,
            userCanceledLoad: isValidValue(userCanceledLoad) ? applicationStartedLoad : false,
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
        loadSaveState.applicationStartedLoad = false;
        loadSaveState.saveState = saveSate;
    },
    applicationErrorsWhileLoading: (loadSaveState: LoadSaveState): void => {
        loadSaveState.applicationErroredWhileLoading = true;
        loadSaveState.applicationStartedLoad = false;
        loadSaveState.saveState = undefined;
    },
    userCancelsLoad: (loadSaveState: LoadSaveState): void => {
        loadSaveState.applicationStartedLoad = false;
        loadSaveState.userCanceledLoad = true;
        loadSaveState.userRequestedLoad = false;
        loadSaveState.saveState = undefined;
    },
    reset: (loadSaveState: LoadSaveState): void => {
        Object.assign(
            loadSaveState,
            newLoadSaveState({
                saveState: undefined,
                applicationStartedLoad: false,
                applicationErroredWhileLoading: false,
                applicationCompletedLoad: false,
                userLoadRequested: false,
                userCanceledLoad: false,
            })
        );
    },
}

const newLoadSaveState = ({
                              saveState,
                              applicationStartedLoad,
                              applicationErroredWhileLoading,
                              applicationCompletedLoad,
                              userLoadRequested,
                              userCanceledLoad
                          }: {
    saveState: BattleSaveState;
    applicationStartedLoad: boolean;
    applicationErroredWhileLoading: boolean;
    applicationCompletedLoad: boolean;
    userLoadRequested: boolean;
    userCanceledLoad: boolean
}): LoadSaveState => {
    return {
        saveState,
        applicationStartedLoad: applicationStartedLoad,
        applicationErroredWhileLoading: applicationErroredWhileLoading,
        applicationCompletedLoad: applicationCompletedLoad,
        userRequestedLoad: userLoadRequested,
        userCanceledLoad,
    }
}
