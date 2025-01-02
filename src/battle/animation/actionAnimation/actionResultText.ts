import {
    RollModifierType,
    RollResultService,
} from "../../calculator/actionCalculator/rollResult"
import { BattleActionActorContext } from "../../history/battleAction/battleActionActorContext"
import { AttributeTypeAndAmount } from "../../../squaddie/attribute/attributeType"

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
        actorContext: BattleActionActorContext
    ): string[] => {
        return getActingSquaddieRollTotalIfNeeded(actorContext)
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
    actingSquaddieModifiers
        .filter((attributeModifier) => attributeModifier.amount != 0)
        .map((attributeModifier) => {
            let padding: string = attributeModifier.amount > 0 ? "+" : ""
            return `   ${padding}${attributeModifier.amount}: ${capitalizeFirstLetter(attributeModifier.type)}`
        })

const getRollModifierDescriptions = (rollModifiers: {
    [r in RollModifierType]?: number
}): string[] =>
    Object.entries(rollModifiers ?? {})
        .filter(([_, amount]) => amount != 0)
        .map(([type, amount]) => {
            let padding: string = amount > 0 ? "+" : ""
            return `   ${padding}${amount}: ${capitalizeFirstLetter(type)}`
        })

const getActingSquaddieRollTotalIfNeeded = (
    actorContext: BattleActionActorContext
): string[] => {
    let totalAttackRoll = RollResultService.totalAttackRoll(
        actorContext.actorRoll
    )
    let totalModifier = actorContext.actorAttributeModifiers.reduce(
        (currentSum, currentValue) => currentSum + currentValue.amount,
        0
    )

    return [` Total ${totalAttackRoll + totalModifier}`]
}
