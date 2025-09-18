import { EnumLike } from "../../utils/enum"

export const BattleEventEffect = {
    CUTSCENE: "CUTSCENE",
    CHALLENGE_MODIFIER: "CHALLENGE_MODIFIER",
} as const satisfies Record<string, string>
export type TBattleEventEffect = EnumLike<typeof BattleEventEffect>

export interface BattleEventEffectBase {
    type: TBattleEventEffect
}

export const BattleEventEffectBaseService = {
    new: (type: TBattleEventEffect): BattleEventEffectBase =>
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
