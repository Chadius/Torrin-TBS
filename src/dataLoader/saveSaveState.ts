export interface SaveSaveState {
    errorDuringSaving: boolean
    savingInProgress: boolean
    userRequestedSave: boolean
}

export const SaveSaveStateService = {
    new: ({
        errorDuringSaving,
        savingInProgress,
    }: {
        errorDuringSaving?: boolean
        savingInProgress?: boolean
    }): SaveSaveState => {
        return newSaveSaveState({
            errorDuringSaving,
            savingInProgress,
        })
    },
    foundErrorDuringSaving: (saveSaveState: SaveSaveState) => {
        saveSaveState.savingInProgress = false
        saveSaveState.errorDuringSaving = true
    },
    userRequestsSave: (saveSaveState: SaveSaveState) => {
        saveSaveState.userRequestedSave = true
        saveSaveState.savingInProgress = true
    },
    savingAttemptIsComplete: (saveSaveState: SaveSaveState) => {
        saveSaveState.savingInProgress = false
    },
    userFinishesRequestingSave: (saveSaveState: SaveSaveState) => {
        saveSaveState.userRequestedSave = false
    },
    didUserRequestSaveAndSaveHasConcluded: (
        saveSaveState: SaveSaveState
    ): boolean => {
        return (
            saveSaveState.userRequestedSave &&
            (saveSaveState.errorDuringSaving || !saveSaveState.savingInProgress)
        )
    },
    reset: (saveSaveState: SaveSaveState) => {
        Object.assign(saveSaveState, newSaveSaveState({}))
    },
    clone: (saveSaveState: SaveSaveState): SaveSaveState => {
        return newSaveSaveState({ ...saveSaveState })
    },
}

const newSaveSaveState = ({
    errorDuringSaving,
    savingInProgress,
    userRequestedSave,
}: {
    errorDuringSaving?: boolean
    savingInProgress?: boolean
    userRequestedSave?: boolean
}): SaveSaveState => {
    return sanitize({
        errorDuringSaving,
        savingInProgress,
        userRequestedSave,
    })
}

const sanitize = (saveSaveState: Partial<SaveSaveState>): SaveSaveState => {
    return {
        errorDuringSaving: saveSaveState.errorDuringSaving ?? false,
        savingInProgress: saveSaveState.savingInProgress ?? false,
        userRequestedSave: saveSaveState.userRequestedSave ?? false,
    }
}
