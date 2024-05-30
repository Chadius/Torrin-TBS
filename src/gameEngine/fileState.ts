import {
    SaveSaveState,
    SaveSaveStateService,
} from "../dataLoader/saveSaveState"
import {
    LoadSaveState,
    LoadSaveStateService,
} from "../dataLoader/loadSaveState"

export interface FileState {
    saveSaveState: SaveSaveState
    loadSaveState: LoadSaveState
}

export const FileStateService = {
    new: ({}: {}): FileState => {
        return {
            saveSaveState: SaveSaveStateService.new({}),
            loadSaveState: LoadSaveStateService.new({}),
        }
    },
}
