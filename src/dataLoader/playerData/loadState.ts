import { BattleSaveState } from "../../battle/history/battleSaveState"
import { GameModeEnum, TGameMode } from "../../utils/startupConfig"

export interface LoadState {
    modeThatInitiatedLoading: TGameMode
    campaignIdThatWasLoaded: string | undefined
    saveState: BattleSaveState | undefined
    applicationStartedLoad: boolean
    applicationCompletedLoad: boolean
    userRequestedLoad: boolean
    userCanceledLoad: boolean
    applicationErroredWhileLoading: boolean
}

export const LoadSaveStateService = {
    new: (params: Partial<LoadState>): LoadState => {
        return newLoadSaveState(params)
    },
    userRequestsLoad: (loadSaveState: LoadState): void => {
        loadSaveState.userRequestedLoad = true
        loadSaveState.applicationErroredWhileLoading = false
        loadSaveState.userCanceledLoad = false
        loadSaveState.applicationCompletedLoad = false
    },
    applicationStartsLoad: (loadSaveState: LoadState): void => {
        loadSaveState.applicationStartedLoad = true
    },
    applicationCompletesLoad: (
        loadSaveState: LoadState,
        saveSate: BattleSaveState | undefined
    ): void => {
        loadSaveState.applicationCompletedLoad = true
        loadSaveState.applicationStartedLoad = false
        loadSaveState.saveState = saveSate
    },
    applicationErrorsWhileLoading: (loadSaveState: LoadState): void => {
        loadSaveState.applicationErroredWhileLoading = true
        loadSaveState.applicationStartedLoad = false
        loadSaveState.saveState = undefined
    },
    userCancelsLoad: (loadSaveState: LoadState): void => {
        loadSaveState.applicationStartedLoad = false
        loadSaveState.userCanceledLoad = true
        loadSaveState.userRequestedLoad = false
        loadSaveState.saveState = undefined
    },
    reset: (loadSaveState: LoadState): void => reset(loadSaveState),
    clone: (loadFlags: LoadState): LoadState => {
        return newLoadSaveState({
            ...loadFlags,
        })
    },
    didUserRequestLoadAndLoadHasConcluded: (
        loadSaveState: LoadState
    ): boolean => {
        return (
            loadSaveState.userRequestedLoad &&
            (loadSaveState.applicationErroredWhileLoading ||
                !loadSaveState.applicationCompletedLoad)
        )
    },
    userFinishesRequestingLoad: (loadSaveState: LoadState) => {
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
    campaignIdThatWasLoaded,
    modeThatInitiatedLoading,
}: Partial<LoadState>): LoadState => {
    return {
        modeThatInitiatedLoading:
            modeThatInitiatedLoading ?? GameModeEnum.UNKNOWN,
        campaignIdThatWasLoaded,
        saveState: saveState,
        applicationStartedLoad: applicationStartedLoad ?? false,
        applicationErroredWhileLoading: applicationErroredWhileLoading ?? false,
        applicationCompletedLoad: applicationCompletedLoad ?? false,
        userRequestedLoad: userRequestedLoad ?? false,
        userCanceledLoad: userCanceledLoad ?? false,
    }
}

const reset = (loadSaveState: LoadState): void => {
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
