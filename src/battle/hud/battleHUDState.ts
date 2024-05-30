import { BATTLE_HUD_MODE } from "../../configuration/config"
import { getValidValueOrDefault } from "../../utils/validityCheck"

export interface BattleHUDState {
    hudMode: BATTLE_HUD_MODE
    hoveredBattleSquaddieId: string
    hoveredBattleSquaddieTimestamp: number
}

export const BattleHUDStateService = {
    new: ({
        hudMode,
        hoveredBattleSquaddieId,
        hoveredBattleSquaddieTimestamp,
    }: {
        hudMode?: BATTLE_HUD_MODE
        hoveredBattleSquaddieId?: string
        hoveredBattleSquaddieTimestamp?: number
    }): BattleHUDState => {
        return newBattleHUDState({
            hudMode,
            hoveredBattleSquaddieId,
            hoveredBattleSquaddieTimestamp,
        })
    },
    clone: (battleHUDState: BattleHUDState): BattleHUDState => {
        return newBattleHUDState({ ...battleHUDState })
    },
}

const newBattleHUDState = ({
    hudMode,
    hoveredBattleSquaddieId,
    hoveredBattleSquaddieTimestamp,
}: {
    hudMode?: BATTLE_HUD_MODE
    hoveredBattleSquaddieId?: string
    hoveredBattleSquaddieTimestamp?: number
}): BattleHUDState => {
    return sanitize({
        hudMode,
        hoveredBattleSquaddieId,
        hoveredBattleSquaddieTimestamp,
    })
}

const sanitize = (battleHUDState: BattleHUDState): BattleHUDState => {
    battleHUDState.hudMode = getValidValueOrDefault(
        battleHUDState.hudMode,
        BATTLE_HUD_MODE.BATTLE_SQUADDIE_SELECTED_HUD
    )
    return battleHUDState
}
