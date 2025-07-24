export enum BattleEventEffectType {
    CUTSCENE = "CUTSCENE",
}

export interface BattleEventEffectBase {
    type: BattleEventEffectType
}

export const BattleEventEffectBaseService = {
    new: (type: BattleEventEffectType): BattleEventEffectBase =>
        sanitize({
            type,
        }),
    sanitize: (battleEventEffect: BattleEventEffectBase) =>
        sanitize(battleEventEffect),
}

const sanitize = (battleEventEffect: BattleEventEffectBase) => {
    if (!battleEventEffect.type) {
        throw new Error("BattleEventEffect.type is undefined")
    }
    return battleEventEffect
}
