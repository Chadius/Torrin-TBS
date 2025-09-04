import {
    BattleEventEffectState,
    BattleEventEffectStateService,
} from "../battle/event/battleEventEffectState"
import {
    BattleEventEffect,
    BattleEventEffectBase,
    BattleEventEffectBaseService,
} from "../battle/event/battleEventEffect"

export interface CutsceneEffect
    extends BattleEventEffectState,
        BattleEventEffectBase {
    cutsceneId: string
}

export const CutsceneEffectService = {
    new: (cutsceneId: string): CutsceneEffect =>
        sanitize({
            cutsceneId,
            type: BattleEventEffect.CUTSCENE,
            alreadyAppliedEffect: false,
        }),
    sanitize: (cutscene: CutsceneEffect) => sanitize(cutscene),
    isCutscene: (
        battleEventEffectBase: BattleEventEffectBase
    ): battleEventEffectBase is CutsceneEffect => {
        return battleEventEffectBase.type === BattleEventEffect.CUTSCENE
    },
}

const sanitize = (cutscene: CutsceneEffect) => {
    if (!cutscene.cutsceneId) {
        throw new Error("Cutscene cutsceneId is undefined")
    }
    BattleEventEffectBaseService.sanitize(cutscene)
    BattleEventEffectStateService.sanitize(cutscene)
    return cutscene
}
