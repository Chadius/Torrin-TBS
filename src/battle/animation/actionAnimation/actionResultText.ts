import { SquaddieSquaddieResults } from "../../history/squaddieSquaddieResults"
import { RollResultService } from "../../calculator/actionCalculator/rollResult"
import { AttributeTypeAndAmount } from "../../../squaddie/attributeModifier"

export const ActionResultText = {
    getAttackPenaltyDescriptions: (
        actingSquaddieModifiers: AttributeTypeAndAmount[]
    ): string[] => {
        return getAttackPenaltyDescriptions(actingSquaddieModifiers)
    },
    getActingSquaddieRollTotalIfNeeded: (
        result: SquaddieSquaddieResults
    ): string[] => {
        return getActingSquaddieRollTotalIfNeeded(result)
    },
}

const capitalizeFirstLetter = (input: string) =>
    (input.charAt(0).toUpperCase() + input.slice(1).toLowerCase()).replaceAll(
        "_",
        " "
    )
const getAttackPenaltyDescriptions = (
    actingSquaddieModifiers: AttributeTypeAndAmount[]
): string[] =>
    actingSquaddieModifiers.map((attributeModifier) => {
        let padding: string = attributeModifier.amount > 0 ? " " : ""
        return `   ${padding}${attributeModifier.amount}: ${capitalizeFirstLetter(attributeModifier.type)}`
    })

const getActingSquaddieRollTotalIfNeeded = (
    result: SquaddieSquaddieResults
): string[] => {
    let totalAttackRoll = RollResultService.totalAttackRoll(
        result.actingContext.actingSquaddieRoll
    )
    let totalModifier = result.actingContext.actingSquaddieModifiers.reduce(
        (currentSum, currentValue) => currentSum + currentValue.amount,
        0
    )

    return [` Total ${totalAttackRoll + totalModifier}`]
}
