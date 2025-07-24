import {
    BattleEventEffectState,
    BattleEventEffectStateService,
} from "../battle/event/battleEventEffectState"
import {
    BattleEventEffectBase,
    BattleEventEffectBaseService,
    BattleEventEffectType,
} from "../battle/event/battleEventEffect"

export interface CutsceneEffect
    extends BattleEventEffectState,
        BattleEventEffectBase {
    cutsceneId: string
    type: BattleEventEffectType.CUTSCENE
}

export const CutsceneEffectService = {
    new: (cutsceneId: string): CutsceneEffect =>
        sanitize({
            cutsceneId,
            type: BattleEventEffectType.CUTSCENE,
            alreadyAppliedEffect: false,
        }),
    sanitize: (cutscene: CutsceneEffect) => sanitize(cutscene),
}

const sanitize = (cutscene: CutsceneEffect) => {
    if (!cutscene.cutsceneId) {
        throw new Error("Cutscene cutsceneId is undefined")
    }
    BattleEventEffectBaseService.sanitize(cutscene)
    BattleEventEffectStateService.sanitize(cutscene)
    return cutscene
}
