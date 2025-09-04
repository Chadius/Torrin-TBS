import {
    TRollModifier,
    RollResultService,
} from "../../calculator/actionCalculator/rollResult"
import { BattleActionActorContext } from "../../history/battleAction/battleActionActorContext"
import { AttributeTypeAndAmount } from "../../../squaddie/attribute/attribute"
import { TextFormatService } from "../../../utils/graphics/textFormatService"

export const ActionResultText = {
    getAttackPenaltyDescriptions: (
        actingSquaddieModifiers: AttributeTypeAndAmount[]
    ): string[] => {
        return getAttackPenaltyDescriptions(actingSquaddieModifiers)
    },
    getRollModifierDescriptions: (rollModifiers: {
        [r in TRollModifier]?: number
    }): string[] => {
        return getRollModifierDescriptions(rollModifiers)
    },
    getActingSquaddieRollTotalIfNeeded: (
        actorContext: BattleActionActorContext
    ): string[] => {
        return getActingSquaddieRollTotalIfNeeded(actorContext)
    },
}

const removeDashFromString = (input: string) => input.replaceAll("_", " ")

const getAttackPenaltyDescriptions = (
    actingSquaddieModifiers: AttributeTypeAndAmount[]
): string[] =>
    actingSquaddieModifiers
        .filter((attributeModifier) => attributeModifier.amount != 0)
        .map((attributeModifier) => {
            return `   ${TextFormatService.padPlusOnPositiveNumber(attributeModifier.amount)}: ${removeDashFromString(
                TextFormatService.titleCase(attributeModifier.type)
            )}`
        })

const getRollModifierDescriptions = (rollModifiers: {
    [r in TRollModifier]?: number
}): string[] =>
    Object.entries(rollModifiers ?? {})
        .filter(([_, amount]) => amount != 0)
        .map(
            ([type, amount]) =>
                `   ${TextFormatService.padPlusOnPositiveNumber(amount)}: ${removeDashFromString(
                    TextFormatService.titleCase(type)
                )}`
        )

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
