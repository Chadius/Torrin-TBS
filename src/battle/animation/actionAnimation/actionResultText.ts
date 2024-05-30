import { ATTACK_MODIFIER, AttackModifierStrings } from "../../modifierConstants"
import { SquaddieSquaddieResults } from "../../history/squaddieSquaddieResults"
import { RollResultService } from "../../actionCalculator/rollResult"

export const ActionResultText = {
    getAttackPenaltyDescriptions: (actingSquaddieModifiers: {
        [modifier in ATTACK_MODIFIER]?: number
    }): string[] => {
        return getAttackPenaltyDescriptions(actingSquaddieModifiers)
    },
    getActingSquaddieRollTotalIfNeeded: (
        result: SquaddieSquaddieResults
    ): string[] => {
        return getActingSquaddieRollTotalIfNeeded(result)
    },
}

const getAttackPenaltyDescriptions = (actingSquaddieModifiers: {
    [modifier in ATTACK_MODIFIER]?: number
}): string[] => {
    return Object.entries(actingSquaddieModifiers).map(([keyStr, value]) => {
        const modifierKey: ATTACK_MODIFIER = keyStr as ATTACK_MODIFIER
        let padding: string = value > 0 ? " " : ""
        return `   ${padding}${value}: ${AttackModifierStrings[modifierKey]}`
    })
}
const getActingSquaddieRollTotalIfNeeded = (
    result: SquaddieSquaddieResults
): string[] => {
    let totalAttackRoll = RollResultService.totalAttackRoll(
        result.actingSquaddieRoll
    )
    let totalModifier = Object.values(result.actingSquaddieModifiers).reduce(
        (currentSum, currentValue) => currentSum + currentValue,
        0
    )

    return [` Total ${totalAttackRoll + totalModifier}`]
}
