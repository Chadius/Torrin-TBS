import {BattleHUDState, BattleHUDStateService} from "./battleHUDState";
import {BATTLE_HUD_MODE} from "../../configuration/config";
import {LoadSaveStateService} from "../../dataLoader/loadSaveState";
import {SaveSaveStateService} from "../../dataLoader/saveSaveState";

describe('BattleHUDState', () => {
    it('can be initialized with default fields', () => {
        const battleHUDState: BattleHUDState = BattleHUDStateService.new({});
        expect(battleHUDState.hudMode).toEqual(BATTLE_HUD_MODE.BATTLE_SQUADDIE_SELECTED_HUD);
        expect(battleHUDState.hoveredBattleSquaddieId).toBeUndefined();
        expect(battleHUDState.hoveredBattleSquaddieTimestamp).toBeUndefined();
        expect(battleHUDState.loadSaveState).not.toBeUndefined();
    });
    it('can be initialized with given fields', () => {
        const battleHUDState: BattleHUDState = BattleHUDStateService.new({
            hudMode: BATTLE_HUD_MODE.BATTLE_HUD_PANEL,
            hoveredBattleSquaddieId: "soldier",
            hoveredBattleSquaddieTimestamp: 12345,
            loadSaveState: LoadSaveStateService.new({
                applicationCompletedLoad: true,
            }),
            saveSaveState: SaveSaveStateService.new({
                savingInProgress: true,
            }),
        });
        expect(battleHUDState.hudMode).toEqual(BATTLE_HUD_MODE.BATTLE_HUD_PANEL);
        expect(battleHUDState.hoveredBattleSquaddieId).toEqual("soldier");
        expect(battleHUDState.hoveredBattleSquaddieTimestamp).toEqual(12345);
        expect(battleHUDState.loadSaveState.applicationCompletedLoad).toBeTruthy();
        expect(battleHUDState.saveSaveState.savingInProgress).toBeTruthy();
    });
    it('can be cloned', () => {
        const battleHUDState: BattleHUDState = BattleHUDStateService.new({
            hudMode: BATTLE_HUD_MODE.BATTLE_HUD_PANEL,
            hoveredBattleSquaddieId: "soldier",
            hoveredBattleSquaddieTimestamp: 12345,
            loadSaveState: LoadSaveStateService.new({
                applicationCompletedLoad: true,
            }),
            saveSaveState: SaveSaveStateService.new({
                savingInProgress: true,
            }),
        });

        const clone = BattleHUDStateService.clone(battleHUDState);

        expect(clone).toEqual(battleHUDState);
    });
});
