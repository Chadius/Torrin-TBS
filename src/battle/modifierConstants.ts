export enum ATTACK_MODIFIER {
    MULTIPLE_ATTACK_PENALTY = "MULTIPLE_ATTACK_PENALTY",
}

export const AttackModifierStrings: { [key in ATTACK_MODIFIER]: string } = {
    [ATTACK_MODIFIER.MULTIPLE_ATTACK_PENALTY]: "Multiple Attack",
}

export const MULTIPLE_ATTACK_PENALTY = -3
export const MULTIPLE_ATTACK_PENALTY_MULTIPLIER_MAX = 2
