export interface BattleEventEffectState {
    alreadyAppliedEffect: boolean
}

export const BattleEventEffectStateService = {
    sanitize: (
        battleEventEffectState: BattleEventEffectState
    ): BattleEventEffectState => sanitize(battleEventEffectState),
}

const sanitize = (
    battleEventEffectState: BattleEventEffectState
): BattleEventEffectState => {
    battleEventEffectState.alreadyAppliedEffect ||= false
    return battleEventEffectState
}
