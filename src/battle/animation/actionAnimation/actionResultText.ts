import {
    RollModifierType,
    RollResultService,
} from "../../calculator/actionCalculator/rollResult"
import { AttributeTypeAndAmount } from "../../../squaddie/attributeModifier"
import { BattleActionActionContext } from "../../history/battleAction/battleActionActionContext"

export const ActionResultText = {
    getAttackPenaltyDescriptions: (
        actingSquaddieModifiers: AttributeTypeAndAmount[]
    ): string[] => {
        return getAttackPenaltyDescriptions(actingSquaddieModifiers)
    },
    getRollModifierDescriptions: (rollModifiers: {
        [r in RollModifierType]?: number
    }): string[] => {
        return getRollModifierDescriptions(rollModifiers)
    },
    getActingSquaddieRollTotalIfNeeded: (
        actingContext: BattleActionActionContext
    ): string[] => {
        return getActingSquaddieRollTotalIfNeeded(actingContext)
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
        let padding: string = attributeModifier.amount > 0 ? "+" : ""
        return `   ${padding}${attributeModifier.amount}: ${capitalizeFirstLetter(attributeModifier.type)}`
    })

const getRollModifierDescriptions = (rollModifiers: {
    [r in RollModifierType]?: number
}): string[] =>
    Object.entries(rollModifiers ?? {}).map(([type, amount]) => {
        let padding: string = amount > 0 ? "+" : ""
        return `   ${padding}${amount}: ${capitalizeFirstLetter(type)}`
    })

const getActingSquaddieRollTotalIfNeeded = (
    actingContext: BattleActionActionContext
): string[] => {
    let totalAttackRoll = RollResultService.totalAttackRoll(
        actingContext.actorRoll
    )
    let totalModifier = actingContext.actorAttributeModifiers.reduce(
        (currentSum, currentValue) => currentSum + currentValue.amount,
        0
    )

    return [` Total ${totalAttackRoll + totalModifier}`]
}
