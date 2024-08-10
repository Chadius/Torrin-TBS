import { ACTOR_MODIFIER, ActorModifierStrings } from "../../modifierConstants"
import { SquaddieSquaddieResults } from "../../history/squaddieSquaddieResults"
import { RollResultService } from "../../actionCalculator/rollResult"

export const ActionResultText = {
    getAttackPenaltyDescriptions: (actingSquaddieModifiers: {
        [modifier in ACTOR_MODIFIER]?: number
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
    [modifier in ACTOR_MODIFIER]?: number
}): string[] => {
    return Object.entries(actingSquaddieModifiers).map(([keyStr, value]) => {
        const modifierKey: ACTOR_MODIFIER = keyStr as ACTOR_MODIFIER
        let padding: string = value > 0 ? " " : ""
        return `   ${padding}${value}: ${ActorModifierStrings[modifierKey]}`
    })
}
const getActingSquaddieRollTotalIfNeeded = (
    result: SquaddieSquaddieResults
): string[] => {
    let totalAttackRoll = RollResultService.totalAttackRoll(
        result.actingContext.actingSquaddieRoll
    )
    let totalModifier = Object.values(
        result.actingContext.actingSquaddieModifiers
    ).reduce((currentSum, currentValue) => currentSum + currentValue, 0)

    return [` Total ${totalAttackRoll + totalModifier}`]
}
