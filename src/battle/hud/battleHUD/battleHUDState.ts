import { SummaryHUDState } from "../summary/summaryHUD"

export interface BattleHUDState {
    nextSquaddieBattleSquaddieIdsToCycleThrough: string[]
    summaryHUDState: SummaryHUDState
}

export const BattleHUDStateService = {
    new: ({
        summaryHUDState,
    }: {
        summaryHUDState?: SummaryHUDState
    }): BattleHUDState => {
        return newBattleHUDState({
            summaryHUDState,
        })
    },
    clone: (battleHUDState: BattleHUDState): BattleHUDState => {
        return newBattleHUDState({ ...battleHUDState })
    },
}

const newBattleHUDState = ({
    summaryHUDState,
}: {
    summaryHUDState?: SummaryHUDState
}): BattleHUDState => {
    return sanitize({
        summaryHUDState,
        nextSquaddieBattleSquaddieIdsToCycleThrough: [],
    })
}

const sanitize = (battleHUDState: BattleHUDState): BattleHUDState => {
    return battleHUDState
}
