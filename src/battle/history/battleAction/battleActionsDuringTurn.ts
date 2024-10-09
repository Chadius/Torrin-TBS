import { BattleAction } from "./battleAction"

export interface BattleActionsDuringTurn {
    battleActions: BattleAction[]
}

export const BattleActionsDuringTurnService = {
    new: (battleActions?: BattleAction[]): BattleActionsDuringTurn =>
        newBattleActionsDuringTurn(battleActions),
    isEmpty: (battleActionsDuringTurn: BattleActionsDuringTurn): boolean => {
        return battleActionsDuringTurn?.battleActions.length === 0
    },
    add: (
        battleActionsDuringTurn: BattleActionsDuringTurn,
        battleActionUseActionTemplate: BattleAction
    ) => {
        if (!battleActionsDuringTurn) {
            return
        }

        battleActionsDuringTurn.battleActions.push(
            battleActionUseActionTemplate
        )
    },
    getAll: (
        battleActionsDuringTurn: BattleActionsDuringTurn
    ): BattleAction[] => getAll(battleActionsDuringTurn),
    clone: (original: BattleActionsDuringTurn): BattleActionsDuringTurn => {
        const allActions = getAll(original)
        return newBattleActionsDuringTurn(allActions)
    },
}

const newBattleActionsDuringTurn = (
    battleActions?: BattleAction[]
): BattleActionsDuringTurn => {
    return {
        battleActions: battleActions ? [...battleActions] : [],
    }
}
const getAll = (
    battleActionsDuringTurn: BattleActionsDuringTurn
): BattleAction[] => {
    if (!battleActionsDuringTurn?.battleActions) {
        return []
    }
    return [...battleActionsDuringTurn.battleActions]
}
