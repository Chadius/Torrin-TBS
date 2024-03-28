import {BattleHUDState, BattleHUDStateService} from "./battleHUDState";
import {BATTLE_HUD_MODE} from "../../configuration/config";

describe('BattleHUDState', () => {
    it('can be initialized with default fields', () => {
        const battleHUDState: BattleHUDState = BattleHUDStateService.new({});
        expect(battleHUDState.hudMode).toEqual(BATTLE_HUD_MODE.BATTLE_SQUADDIE_SELECTED_HUD);
        expect(battleHUDState.hoveredBattleSquaddieId).toBeUndefined();
        expect(battleHUDState.hoveredBattleSquaddieTimestamp).toBeUndefined();
    });
    it('can be initialized with given fields', () => {
        const battleHUDState: BattleHUDState = BattleHUDStateService.new({
            hudMode: BATTLE_HUD_MODE.BATTLE_HUD_PANEL,
            hoveredBattleSquaddieId: "soldier",
            hoveredBattleSquaddieTimestamp: 12345,
        });
        expect(battleHUDState.hudMode).toEqual(BATTLE_HUD_MODE.BATTLE_HUD_PANEL);
        expect(battleHUDState.hoveredBattleSquaddieId).toEqual("soldier");
        expect(battleHUDState.hoveredBattleSquaddieTimestamp).toEqual(12345);
    });
    it('can be cloned', () => {
        const battleHUDState: BattleHUDState = BattleHUDStateService.new({
            hudMode: BATTLE_HUD_MODE.BATTLE_HUD_PANEL,
            hoveredBattleSquaddieId: "soldier",
            hoveredBattleSquaddieTimestamp: 12345,
        });

        const clone = BattleHUDStateService.clone(battleHUDState);

        expect(clone).toEqual(battleHUDState);
    });
});
