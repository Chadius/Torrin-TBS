import {
    BattleEventEffectState,
    BattleEventEffectStateService,
} from "../../battleEventEffectState"
import {
    BattleEventEffectBase,
    BattleEventEffectBaseService,
    BattleEventEffectType,
} from "../../battleEventEffect"
import {
    ChallengeModifierType,
    ChallengeModifierValue,
} from "../../../challengeModifier/challengeModifierSetting"

export interface ChallengeModifierEffect
    extends BattleEventEffectState,
        BattleEventEffectBase {
    type: BattleEventEffectType.CHALLENGE_MODIFIER
    challengeModifierType: ChallengeModifierType
    value: ChallengeModifierValue
}

export const ChallengeModifierEffectService = {
    new: (
        challengeModifierType: ChallengeModifierType,
        value: ChallengeModifierValue
    ): ChallengeModifierEffect =>
        sanitize({
            challengeModifierType,
            value,
            type: BattleEventEffectType.CHALLENGE_MODIFIER,
            alreadyAppliedEffect: false,
        }),
    sanitize: (challengeModifierEffect: ChallengeModifierEffect) =>
        sanitize(challengeModifierEffect),
}

const sanitize = (effect: ChallengeModifierEffect) => {
    if (!effect.challengeModifierType) {
        throw new Error(
            "[ChallengeModifierService.sanitize] challengeModifierType is undefined"
        )
    }
    BattleEventEffectBaseService.sanitize(effect)
    BattleEventEffectStateService.sanitize(effect)
    return effect
}
