export enum ACTOR_MODIFIER {
    MULTIPLE_ATTACK_PENALTY = "MULTIPLE_ATTACK_PENALTY",
}

export const ActorModifierStrings: { [key in ACTOR_MODIFIER]: string } = {
    [ACTOR_MODIFIER.MULTIPLE_ATTACK_PENALTY]: "Multiple Attack",
}

export const MULTIPLE_ATTACK_PENALTY = -3
export const MULTIPLE_ATTACK_PENALTY_MULTIPLIER_MAX = 2
