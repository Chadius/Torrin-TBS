import { BattleSquaddie } from "../battleSquaddie"
import { AttributeType } from "../../squaddie/attributeModifier"
import { InBattleAttributesService } from "../stats/inBattleAttributes"

export const CalculateAgainstArmor = {
    getTargetSquaddieModifierTotal: (
        targetedBattleSquaddie: BattleSquaddie
    ): {
        modifierTotal: number
        modifiers: { [modifier in AttributeType]?: number }
    } => {
        return getTargetSquaddieModifierTotal(targetedBattleSquaddie)
    },
}

const getTargetSquaddieModifierTotal = (
    targetedBattleSquaddie: BattleSquaddie
): {
    modifierTotal: number
    modifiers: { [modifier in AttributeType]?: number }
} => {
    const targetSquaddieModifiersForThisSquaddie: {
        [modifier in AttributeType]?: number
    } = {}
    const targetAttributeModifiers =
        InBattleAttributesService.calculateCurrentAttributeModifiers(
            targetedBattleSquaddie.inBattleAttributes
        )
    const armorAttackTargetTypes: AttributeType[] = [AttributeType.ARMOR]
    const relevantTargetSquaddieAttributeModifiers: {
        type: AttributeType
        amount: number
    }[] = targetAttributeModifiers.filter((modifier) =>
        armorAttackTargetTypes.includes(modifier.type)
    )
    let targetSquaddieModifierTotal: number =
        relevantTargetSquaddieAttributeModifiers.reduce((sum, modifier) => {
            return sum + modifier.amount
        }, 0)
    relevantTargetSquaddieAttributeModifiers.forEach((typeAndAmount) => {
        if (
            targetSquaddieModifiersForThisSquaddie[typeAndAmount.type] ===
            undefined
        ) {
            targetSquaddieModifiersForThisSquaddie[typeAndAmount.type] = 0
        }
        targetSquaddieModifiersForThisSquaddie[typeAndAmount.type] +=
            typeAndAmount.amount
    })

    return {
        modifiers: targetSquaddieModifiersForThisSquaddie,
        modifierTotal: targetSquaddieModifierTotal,
    }
}
