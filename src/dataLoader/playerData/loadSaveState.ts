import { BattleSaveState } from "../../battle/history/battleSaveState"

export interface LoadSaveState {
    saveState: BattleSaveState | undefined
    applicationStartedLoad: boolean
    applicationCompletedLoad: boolean
    userRequestedLoad: boolean
    userCanceledLoad: boolean
    applicationErroredWhileLoading: boolean
}

export const LoadSaveStateService = {
    new: ({
        saveState,
        applicationStartedLoad,
        applicationErroredWhileLoading,
        applicationCompletedLoad,
        userRequestedLoad,
        userCanceledLoad,
    }: {
        saveState?: BattleSaveState
        applicationStartedLoad?: boolean
        applicationErroredWhileLoading?: boolean
        applicationCompletedLoad?: boolean
        userRequestedLoad?: boolean
        userCanceledLoad?: boolean
    }): LoadSaveState => {
        return newLoadSaveState({
            saveState: saveState ?? undefined,
            applicationStartedLoad: applicationStartedLoad ?? false,
            applicationErroredWhileLoading:
                applicationErroredWhileLoading ?? false,
            applicationCompletedLoad: applicationCompletedLoad ?? false,
            userRequestedLoad: userRequestedLoad ?? false,
            userCanceledLoad: userCanceledLoad ?? false,
        })
    },
    userRequestsLoad: (loadSaveState: LoadSaveState): void => {
        loadSaveState.userRequestedLoad = true
        loadSaveState.applicationErroredWhileLoading = false
        loadSaveState.userCanceledLoad = false
        loadSaveState.applicationCompletedLoad = false
    },
    applicationStartsLoad: (loadSaveState: LoadSaveState): void => {
        loadSaveState.applicationStartedLoad = true
    },
    applicationCompletesLoad: (
        loadSaveState: LoadSaveState,
        saveSate: BattleSaveState | undefined
    ): void => {
        loadSaveState.applicationCompletedLoad = true
        loadSaveState.applicationStartedLoad = false
        loadSaveState.saveState = saveSate
    },
    applicationErrorsWhileLoading: (loadSaveState: LoadSaveState): void => {
        loadSaveState.applicationErroredWhileLoading = true
        loadSaveState.applicationStartedLoad = false
        loadSaveState.saveState = undefined
    },
    userCancelsLoad: (loadSaveState: LoadSaveState): void => {
        loadSaveState.applicationStartedLoad = false
        loadSaveState.userCanceledLoad = true
        loadSaveState.userRequestedLoad = false
        loadSaveState.saveState = undefined
    },
    reset: (loadSaveState: LoadSaveState): void => reset(loadSaveState),
    clone: (loadFlags: LoadSaveState): LoadSaveState => {
        return newLoadSaveState({
            ...loadFlags,
        })
    },
    didUserRequestLoadAndLoadHasConcluded: (
        loadSaveState: LoadSaveState
    ): boolean => {
        return (
            loadSaveState.userRequestedLoad &&
            (loadSaveState.applicationErroredWhileLoading ||
                !loadSaveState.applicationCompletedLoad)
        )
    },
    userFinishesRequestingLoad: (loadSaveState: LoadSaveState) => {
        loadSaveState.userRequestedLoad = false
    },
}

const newLoadSaveState = ({
    saveState,
    applicationStartedLoad,
    applicationErroredWhileLoading,
    applicationCompletedLoad,
    userRequestedLoad,
    userCanceledLoad,
}: {
    saveState: BattleSaveState | undefined
    applicationStartedLoad: boolean
    applicationErroredWhileLoading: boolean
    applicationCompletedLoad: boolean
    userRequestedLoad: boolean
    userCanceledLoad: boolean
}): LoadSaveState => {
    return {
        saveState,
        applicationStartedLoad: applicationStartedLoad,
        applicationErroredWhileLoading: applicationErroredWhileLoading,
        applicationCompletedLoad: applicationCompletedLoad,
        userRequestedLoad: userRequestedLoad,
        userCanceledLoad,
    }
}

const reset = (loadSaveState: LoadSaveState): void => {
    Object.assign(
        loadSaveState,
        newLoadSaveState({
            saveState: undefined,
            applicationStartedLoad: false,
            applicationErroredWhileLoading: false,
            applicationCompletedLoad: false,
            userRequestedLoad: false,
            userCanceledLoad: false,
        })
    )
}
