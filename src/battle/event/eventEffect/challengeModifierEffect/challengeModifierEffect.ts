import {
    BattleEventEffectState,
    BattleEventEffectStateService,
} from "../../battleEventEffectState"
import {
    BattleEventEffect,
    BattleEventEffectBase,
    BattleEventEffectBaseService,
} from "../../battleEventEffect"
import {
    TChallengeModifier,
    ChallengeModifierValue,
} from "../../../challengeModifier/challengeModifierSetting"

export interface ChallengeModifierEffect
    extends BattleEventEffectState,
        BattleEventEffectBase {
    challengeModifierType: TChallengeModifier
    value: ChallengeModifierValue
}

export const ChallengeModifierEffectService = {
    new: (
        challengeModifierType: TChallengeModifier,
        value: ChallengeModifierValue
    ): ChallengeModifierEffect =>
        sanitize({
            challengeModifierType,
            value,
            type: BattleEventEffect.CHALLENGE_MODIFIER,
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
