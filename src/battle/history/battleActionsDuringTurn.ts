import { BattleAction } from "./battleAction"

export interface BattleActionsDuringTurn {
    battleActions: BattleAction[]
}

export const BattleActionsDuringTurnService = {
    new: (battleActions?: BattleAction[]): BattleActionsDuringTurn => {
        return {
            battleActions: battleActions ? [...battleActions] : [],
        }
    },
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
    ): BattleAction[] => {
        if (!battleActionsDuringTurn) {
            return []
        }
        return [...battleActionsDuringTurn.battleActions]
    },
}
