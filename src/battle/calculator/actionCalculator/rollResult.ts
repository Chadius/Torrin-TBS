export const DIE_SIZE = 6

export enum RollModifierType {
    MULTIPLE_ATTACK_PENALTY = "MULTIPLE_ATTACK_PENALTY",
    TIER = "TIER",
}

export interface RollResult {
    occurred: boolean
    rolls: number[]
    rollModifiers: {
        [t in RollModifierType]?: number
    }
}

export const RollResultService = {
    new: ({
        rolls,
        occurred,
        rollModifiers,
    }: {
        rolls?: number[]
        occurred?: boolean
        rollModifiers?: {
            [t in RollModifierType]?: number
        }
    }): RollResult => {
        return sanitize({
            rolls,
            occurred,
            rollModifiers,
        })
    },
    sanitize: (rollResult: RollResult): RollResult => {
        return sanitize(rollResult)
    },
    isACriticalSuccess: (rollResult: RollResult) =>
        totalAttackRoll(rollResult) >= DIE_SIZE * 2,
    isACriticalFailure: (rollResult: RollResult) =>
        totalAttackRoll(rollResult) <= 2,
    totalAttackRoll: (rollResult: RollResult) => totalAttackRoll(rollResult),
}

const sanitize = (rollResult: RollResult): RollResult => {
    rollResult.occurred = rollResult.rolls && rollResult.rolls.length > 0
    rollResult.rolls =
        rollResult.rolls && rollResult.rolls.length > 0 ? rollResult.rolls : []
    return rollResult
}

const totalAttackRoll = (rollResult: RollResult) => {
    return (
        rollResult.rolls.reduce(
            (currentSum, currentValue) => currentSum + currentValue,
            0
        ) +
        Object.values(rollResult.rollModifiers ?? []).reduce(
            (currentSum, currentValue) => currentSum + currentValue,
            0
        )
    )
}
