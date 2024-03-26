import {BATTLE_HUD_MODE} from "../../configuration/config";
import {getValidValueOrDefault} from "../../utils/validityCheck";
import {LoadSaveState, LoadSaveStateService} from "../../dataLoader/loadSaveState";
import {SaveSaveState, SaveSaveStateService} from "../../dataLoader/saveSaveState";

export interface BattleHUDState {
    hudMode: BATTLE_HUD_MODE;
    hoveredBattleSquaddieId: string;
    hoveredBattleSquaddieTimestamp: number;
    loadSaveState: LoadSaveState; // TODO Nope should not be here, move into game engine state
    saveSaveState: SaveSaveState; // TODO Nope should not be here, move into game engine state
}

export const BattleHUDStateService = {
    new: ({
              hudMode,
              hoveredBattleSquaddieId,
              hoveredBattleSquaddieTimestamp,
              loadSaveState,
              saveSaveState,
          }: {
        hudMode?: BATTLE_HUD_MODE
        hoveredBattleSquaddieId?: string,
        hoveredBattleSquaddieTimestamp?: number,
        loadSaveState?: LoadSaveState,
        saveSaveState?: SaveSaveState,
    }): BattleHUDState => {
        return newBattleHUDState({
            hudMode,
            hoveredBattleSquaddieId,
            hoveredBattleSquaddieTimestamp,
            loadSaveState,
            saveSaveState,
        });
    },
    clone: (battleHUDState: BattleHUDState): BattleHUDState => {
        return newBattleHUDState({...battleHUDState});
    }
}

const newBattleHUDState = ({
                               hudMode,
                               hoveredBattleSquaddieId,
                               hoveredBattleSquaddieTimestamp,
                               loadSaveState,
                               saveSaveState,
                           }: {
    hudMode?: BATTLE_HUD_MODE
    hoveredBattleSquaddieId?: string,
    hoveredBattleSquaddieTimestamp?: number,
    loadSaveState?: LoadSaveState,
    saveSaveState?: SaveSaveState,
}): BattleHUDState => {
    return sanitize({
        hudMode,
        hoveredBattleSquaddieId,
        hoveredBattleSquaddieTimestamp,
        loadSaveState,
        saveSaveState,
    });
};

const sanitize = (battleHUDState: BattleHUDState): BattleHUDState => {
    battleHUDState.hudMode = getValidValueOrDefault(battleHUDState.hudMode, BATTLE_HUD_MODE.BATTLE_SQUADDIE_SELECTED_HUD);
    battleHUDState.loadSaveState = getValidValueOrDefault(battleHUDState.loadSaveState, LoadSaveStateService.new({}));
    battleHUDState.saveSaveState = getValidValueOrDefault(battleHUDState.saveSaveState, SaveSaveStateService.new({}));
    return battleHUDState;
}
