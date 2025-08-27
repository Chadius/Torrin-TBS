import { DegreeOfSuccessExplanation } from "./calculator"
import { DegreeOfSuccess } from "./degreeOfSuccess"
import { TextFormatService } from "../../../utils/graphics/textFormatService"

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
        return `${TextFormatService.titleCase(type).replaceAll("_", " ")}`
    },
}

export interface RollResult {
    occurred: boolean
    rolls: number[]
    rollModifiers: {
        [t in RollModifierType]?: number
    }
}

const SUCCESS_BONUS_CANNOT_FAIL = 4
const SUCCESS_BONUS_CANNOT_CRITICALLY_FAIL = -2
const SUCCESS_BONUS_CANNOT_CRITICALLY_SUCCEED = -13
const SUCCESS_BONUS_CANNOT_SUCCEED = -19

export const RollResultService = {
    DIE_SIZE,
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
        sumOfDiceRolls(rollResult) >= DIE_SIZE + DIE_SIZE,
    isMinimumRoll: (rollResult: RollResult) => sumOfDiceRolls(rollResult) <= 2,
    totalAttackRoll: (rollResult: RollResult) => totalAttackRoll(rollResult),
    getPossibleDegreesOfSuccessBasedOnBonus: (
        successBonus: number
    ): DegreeOfSuccess[] => {
        return Object.entries(
            calculateChanceOfDegreeOfSuccessBasedOnSuccessBonus(successBonus)
        )
            .filter(([_, chance]) => chance > 0)
            .map(
                ([degreeOfSuccessStr, _]) =>
                    degreeOfSuccessStr as DegreeOfSuccess
            )
    },
    calculateChanceOfDegreeOfSuccessBasedOnSuccessBonus: (
        successBonus: number
    ) => calculateChanceOfDegreeOfSuccessBasedOnSuccessBonus(successBonus),
    getSumOfRollModifiers: (rollResult: RollResult): number =>
        getSumOfRollModifiers(rollResult),
}

const sanitize = (rollResult: RollResult): RollResult => {
    rollResult.occurred = rollResult.rolls && rollResult.rolls.length > 0
    rollResult.rolls =
        rollResult.rolls && rollResult.rolls.length > 0 ? rollResult.rolls : []
    return rollResult
}

const getSumOfRollModifiers = (rollResult: RollResult) => {
    return Object.values(rollResult.rollModifiers ?? []).reduce(
        (currentSum, currentValue) => currentSum + currentValue,
        0
    )
}

const totalAttackRoll = (rollResult: RollResult) =>
    sumOfDiceRolls(rollResult) + getSumOfRollModifiers(rollResult)

const sumOfDiceRolls = (rollResult: RollResult) =>
    rollResult.rolls.reduce(
        (currentSum, currentValue) => currentSum + currentValue,
        0
    )

const calculateChanceOfDegreeOfSuccessBasedOnSuccessBonus = (
    actingSquaddieModifierTotal: number
): DegreeOfSuccessExplanation => {
    const chanceOutOf36: {
        [actorBonusOverDefender: number]: {
            [DegreeOfSuccess.CRITICAL_SUCCESS]: number
            [DegreeOfSuccess.SUCCESS]: number
            [DegreeOfSuccess.FAILURE]: number
            [DegreeOfSuccess.CRITICAL_FAILURE]: number
        }
    } = {
        [SUCCESS_BONUS_CANNOT_FAIL]: {
            [DegreeOfSuccess.CRITICAL_SUCCESS]: 35,
            [DegreeOfSuccess.SUCCESS]: 1,
            [DegreeOfSuccess.FAILURE]: 0,
            [DegreeOfSuccess.CRITICAL_FAILURE]: 0,
        },
        [3]: {
            [DegreeOfSuccess.CRITICAL_SUCCESS]: 35,
            [DegreeOfSuccess.SUCCESS]: 0,
            [DegreeOfSuccess.FAILURE]: 1,
            [DegreeOfSuccess.CRITICAL_FAILURE]: 0,
        },
        [2]: {
            [DegreeOfSuccess.CRITICAL_SUCCESS]: 33,
            [DegreeOfSuccess.SUCCESS]: 2,
            [DegreeOfSuccess.FAILURE]: 1,
            [DegreeOfSuccess.CRITICAL_FAILURE]: 0,
        },
        [1]: {
            [DegreeOfSuccess.CRITICAL_SUCCESS]: 30,
            [DegreeOfSuccess.SUCCESS]: 5,
            [DegreeOfSuccess.FAILURE]: 1,
            [DegreeOfSuccess.CRITICAL_FAILURE]: 0,
        },
        [0]: {
            [DegreeOfSuccess.CRITICAL_SUCCESS]: 26,
            [DegreeOfSuccess.SUCCESS]: 9,
            [DegreeOfSuccess.FAILURE]: 1,
            [DegreeOfSuccess.CRITICAL_FAILURE]: 0,
        },
        [-1]: {
            [DegreeOfSuccess.CRITICAL_SUCCESS]: 21,
            [DegreeOfSuccess.SUCCESS]: 14,
            [DegreeOfSuccess.FAILURE]: 1,
            [DegreeOfSuccess.CRITICAL_FAILURE]: 0,
        },
        [SUCCESS_BONUS_CANNOT_CRITICALLY_FAIL]: {
            [DegreeOfSuccess.CRITICAL_SUCCESS]: 15,
            [DegreeOfSuccess.SUCCESS]: 20,
            [DegreeOfSuccess.FAILURE]: 1,
            [DegreeOfSuccess.CRITICAL_FAILURE]: 0,
        },
        [-3]: {
            [DegreeOfSuccess.CRITICAL_SUCCESS]: 10,
            [DegreeOfSuccess.SUCCESS]: 25,
            [DegreeOfSuccess.FAILURE]: 0,
            [DegreeOfSuccess.CRITICAL_FAILURE]: 1,
        },
        [-4]: {
            [DegreeOfSuccess.CRITICAL_SUCCESS]: 6,
            [DegreeOfSuccess.SUCCESS]: 27,
            [DegreeOfSuccess.FAILURE]: 2,
            [DegreeOfSuccess.CRITICAL_FAILURE]: 1,
        },
        [-5]: {
            [DegreeOfSuccess.CRITICAL_SUCCESS]: 3,
            [DegreeOfSuccess.SUCCESS]: 27,
            [DegreeOfSuccess.FAILURE]: 5,
            [DegreeOfSuccess.CRITICAL_FAILURE]: 1,
        },
        [-6]: {
            [DegreeOfSuccess.CRITICAL_SUCCESS]: 1,
            [DegreeOfSuccess.SUCCESS]: 25,
            [DegreeOfSuccess.FAILURE]: 9,
            [DegreeOfSuccess.CRITICAL_FAILURE]: 1,
        },
        [-7]: {
            [DegreeOfSuccess.CRITICAL_SUCCESS]: 1,
            [DegreeOfSuccess.SUCCESS]: 20,
            [DegreeOfSuccess.FAILURE]: 14,
            [DegreeOfSuccess.CRITICAL_FAILURE]: 1,
        },
        [-8]: {
            [DegreeOfSuccess.CRITICAL_SUCCESS]: 1,
            [DegreeOfSuccess.SUCCESS]: 14,
            [DegreeOfSuccess.FAILURE]: 20,
            [DegreeOfSuccess.CRITICAL_FAILURE]: 1,
        },
        [-9]: {
            [DegreeOfSuccess.CRITICAL_SUCCESS]: 1,
            [DegreeOfSuccess.SUCCESS]: 9,
            [DegreeOfSuccess.FAILURE]: 25,
            [DegreeOfSuccess.CRITICAL_FAILURE]: 1,
        },
        [-10]: {
            [DegreeOfSuccess.CRITICAL_SUCCESS]: 1,
            [DegreeOfSuccess.SUCCESS]: 5,
            [DegreeOfSuccess.FAILURE]: 27,
            [DegreeOfSuccess.CRITICAL_FAILURE]: 3,
        },
        [-11]: {
            [DegreeOfSuccess.CRITICAL_SUCCESS]: 1,
            [DegreeOfSuccess.SUCCESS]: 2,
            [DegreeOfSuccess.FAILURE]: 27,
            [DegreeOfSuccess.CRITICAL_FAILURE]: 6,
        },
        [-12]: {
            [DegreeOfSuccess.CRITICAL_SUCCESS]: 1,
            [DegreeOfSuccess.SUCCESS]: 0,
            [DegreeOfSuccess.FAILURE]: 25,
            [DegreeOfSuccess.CRITICAL_FAILURE]: 10,
        },
        [SUCCESS_BONUS_CANNOT_CRITICALLY_SUCCEED]: {
            [DegreeOfSuccess.CRITICAL_SUCCESS]: 0,
            [DegreeOfSuccess.SUCCESS]: 1,
            [DegreeOfSuccess.FAILURE]: 20,
            [DegreeOfSuccess.CRITICAL_FAILURE]: 15,
        },
        [-14]: {
            [DegreeOfSuccess.CRITICAL_SUCCESS]: 0,
            [DegreeOfSuccess.SUCCESS]: 1,
            [DegreeOfSuccess.FAILURE]: 14,
            [DegreeOfSuccess.CRITICAL_FAILURE]: 21,
        },
        [-15]: {
            [DegreeOfSuccess.CRITICAL_SUCCESS]: 0,
            [DegreeOfSuccess.SUCCESS]: 1,
            [DegreeOfSuccess.FAILURE]: 9,
            [DegreeOfSuccess.CRITICAL_FAILURE]: 26,
        },
        [-16]: {
            [DegreeOfSuccess.CRITICAL_SUCCESS]: 0,
            [DegreeOfSuccess.SUCCESS]: 1,
            [DegreeOfSuccess.FAILURE]: 5,
            [DegreeOfSuccess.CRITICAL_FAILURE]: 30,
        },
        [-17]: {
            [DegreeOfSuccess.CRITICAL_SUCCESS]: 0,
            [DegreeOfSuccess.SUCCESS]: 1,
            [DegreeOfSuccess.FAILURE]: 2,
            [DegreeOfSuccess.CRITICAL_FAILURE]: 33,
        },
        [-18]: {
            [DegreeOfSuccess.CRITICAL_SUCCESS]: 0,
            [DegreeOfSuccess.SUCCESS]: 1,
            [DegreeOfSuccess.FAILURE]: 0,
            [DegreeOfSuccess.CRITICAL_FAILURE]: 35,
        },
        [-19]: {
            [DegreeOfSuccess.CRITICAL_SUCCESS]: 0,
            [DegreeOfSuccess.SUCCESS]: 0,
            [DegreeOfSuccess.FAILURE]: 1,
            [DegreeOfSuccess.CRITICAL_FAILURE]: 35,
        },
    }

    switch (true) {
        case actingSquaddieModifierTotal > SUCCESS_BONUS_CANNOT_FAIL:
            return {
                [DegreeOfSuccess.CRITICAL_SUCCESS]: 35,
                [DegreeOfSuccess.SUCCESS]: 1,
                [DegreeOfSuccess.FAILURE]: 0,
                [DegreeOfSuccess.CRITICAL_FAILURE]: 0,
                [DegreeOfSuccess.NONE]: undefined,
            }
        case actingSquaddieModifierTotal < SUCCESS_BONUS_CANNOT_SUCCEED:
            return {
                [DegreeOfSuccess.CRITICAL_SUCCESS]: 0,
                [DegreeOfSuccess.SUCCESS]: 0,
                [DegreeOfSuccess.FAILURE]: 1,
                [DegreeOfSuccess.CRITICAL_FAILURE]: 35,
                [DegreeOfSuccess.NONE]: undefined,
            }
        default:
            return {
                ...chanceOutOf36[actingSquaddieModifierTotal],
                [DegreeOfSuccess.NONE]: undefined,
            }
    }
}
