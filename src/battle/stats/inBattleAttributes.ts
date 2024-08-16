import {
    ArmyAttributes,
    DefaultArmyAttributes,
} from "../../squaddie/armyAttributes"
import { DamageType } from "../../squaddie/squaddieService"
import {
    AttributeModifier,
    AttributeModifierService,
    AttributeTypeAndAmount,
} from "../../squaddie/attributeModifier"

export interface InBattleAttributes {
    armyAttributes: ArmyAttributes
    currentHitPoints: number
    attributeModifiers: AttributeModifier[]
}

export const InBattleAttributesService = {
    new: ({
        armyAttributes,
        currentHitPoints,
        attributeModifiers,
    }: {
        armyAttributes?: ArmyAttributes
        currentHitPoints?: number
        attributeModifiers?: AttributeModifier[]
    }): InBattleAttributes => {
        return newAttributeModifier({
            armyAttributes,
            currentHitPoints,
            attributeModifiers,
        })
    },
    takeDamage(
        data: InBattleAttributes,
        damageToTake: number,
        damageType: DamageType
    ): number {
        const startingHitPoints = data.currentHitPoints

        data.currentHitPoints -= damageToTake
        if (data.currentHitPoints < 0) {
            data.currentHitPoints = 0
        }

        return startingHitPoints - data.currentHitPoints
    },
    receiveHealing(data: InBattleAttributes, amountHealed: number): number {
        const startingHitPoints = data.currentHitPoints

        data.currentHitPoints += amountHealed
        if (data.currentHitPoints > data.armyAttributes.maxHitPoints) {
            data.currentHitPoints = data.armyAttributes.maxHitPoints
        }

        return data.currentHitPoints - startingHitPoints
    },
    clone: (inBattleAttributes: InBattleAttributes): InBattleAttributes => {
        return newAttributeModifier({
            armyAttributes: inBattleAttributes.armyAttributes,
            currentHitPoints: inBattleAttributes.currentHitPoints,
            attributeModifiers: [...inBattleAttributes.attributeModifiers],
        })
    },
    getAllActiveAttributeModifiers: (
        attributes: InBattleAttributes
    ): AttributeModifier[] => {
        return getAllActiveAttributeModifiers(attributes)
    },
    calculateCurrentAttributeModifiers: (
        attributes: InBattleAttributes
    ): AttributeTypeAndAmount[] =>
        AttributeModifierService.calculateCurrentAttributeModifiers(
            attributes.attributeModifiers
        ),
    addActiveAttributeModifier: (
        attributes: InBattleAttributes,
        attributeModifier: AttributeModifier
    ) => {
        attributes.attributeModifiers.push({ ...attributeModifier })
    },
    decreaseModifiersBy1Round: (attributes: InBattleAttributes) => {
        attributes.attributeModifiers.forEach((modifier) => {
            AttributeModifierService.decreaseDuration(modifier, 1)
        })
    },
    spend1UseOnModifiers: (attributes: InBattleAttributes) => {
        attributes.attributeModifiers.forEach(AttributeModifierService.spendUse)
    },
    removeInactiveAttributeModifiers: (attributes: InBattleAttributes) => {
        attributes.attributeModifiers =
            getAllActiveAttributeModifiers(attributes)
    },
}

const getAllActiveAttributeModifiers = (
    attributes: InBattleAttributes
): AttributeModifier[] => {
    return attributes.attributeModifiers.filter(
        AttributeModifierService.isActive
    )
}

const newAttributeModifier = ({
    armyAttributes,
    currentHitPoints,
    attributeModifiers,
}: {
    armyAttributes?: ArmyAttributes
    currentHitPoints?: number
    attributeModifiers?: AttributeModifier[]
}): InBattleAttributes => {
    return {
        armyAttributes: armyAttributes || DefaultArmyAttributes(),
        currentHitPoints:
            currentHitPoints ??
            armyAttributes?.maxHitPoints ??
            DefaultArmyAttributes().maxHitPoints,
        attributeModifiers: attributeModifiers || [],
    }
}
