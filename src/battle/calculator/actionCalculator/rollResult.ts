import { TextHandlingService } from "../../../utils/graphics/textHandlingService"

export const DIE_SIZE = 6

export enum RollModifierType {
    MULTIPLE_ATTACK_PENALTY = "MULTIPLE_ATTACK_PENALTY",
    PROFICIENCY = "PROFICIENCY",
}

export const RollModifierTypeService = {
    readableName: ({
        type,
        abbreviate,
    }: {
        type: RollModifierType
        abbreviate?: boolean
    }): string => {
        if (abbreviate) {
            if (type === RollModifierType.MULTIPLE_ATTACK_PENALTY) return "MAP"
            if (type === RollModifierType.PROFICIENCY) return "Prof"
        }
        return `${TextHandlingService.titleCase(type).replaceAll("_", " ")}`
    },
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
    isMaximumRoll: (rollResult: RollResult) =>
        sumOfDiceRolls(rollResult) >= DIE_SIZE * 2,
    isMinimumRoll: (rollResult: RollResult) => sumOfDiceRolls(rollResult) <= 2,
    totalAttackRoll: (rollResult: RollResult) => totalAttackRoll(rollResult),
}

const sanitize = (rollResult: RollResult): RollResult => {
    rollResult.occurred = rollResult.rolls && rollResult.rolls.length > 0
    rollResult.rolls =
        rollResult.rolls && rollResult.rolls.length > 0 ? rollResult.rolls : []
    return rollResult
}

const totalAttackRoll = (rollResult: RollResult) =>
    sumOfDiceRolls(rollResult) +
    Object.values(rollResult.rollModifiers ?? []).reduce(
        (currentSum, currentValue) => currentSum + currentValue,
        0
    )

const sumOfDiceRolls = (rollResult: RollResult) =>
    rollResult.rolls.reduce(
        (currentSum, currentValue) => currentSum + currentValue,
        0
    )
