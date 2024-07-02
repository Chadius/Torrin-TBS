import { BATTLE_HUD_MODE } from "../../configuration/config"
import { getValidValueOrDefault } from "../../utils/validityCheck"
import { SummaryHUDState } from "./summaryHUD"

export interface BattleHUDState {
    hudMode: BATTLE_HUD_MODE
    hoveredBattleSquaddieId: string
    hoveredBattleSquaddieTimestamp: number
    summaryHUDState: SummaryHUDState
}

export const BattleHUDStateService = {
    new: ({
        hudMode,
        hoveredBattleSquaddieId,
        hoveredBattleSquaddieTimestamp,
        summaryHUDState,
    }: {
        hudMode?: BATTLE_HUD_MODE
        hoveredBattleSquaddieId?: string
        hoveredBattleSquaddieTimestamp?: number
        summaryHUDState?: SummaryHUDState
    }): BattleHUDState => {
        return newBattleHUDState({
            hudMode,
            hoveredBattleSquaddieId,
            hoveredBattleSquaddieTimestamp,
            summaryHUDState,
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
    summaryHUDState,
}: {
    hudMode?: BATTLE_HUD_MODE
    hoveredBattleSquaddieId?: string
    hoveredBattleSquaddieTimestamp?: number
    summaryHUDState?: SummaryHUDState
}): BattleHUDState => {
    return sanitize({
        hudMode,
        hoveredBattleSquaddieId,
        hoveredBattleSquaddieTimestamp,
        summaryHUDState,
    })
}

const sanitize = (battleHUDState: BattleHUDState): BattleHUDState => {
    battleHUDState.hudMode = getValidValueOrDefault(
        battleHUDState.hudMode,
        BATTLE_HUD_MODE.BATTLE_SQUADDIE_SELECTED_HUD
    )
    return battleHUDState
}
