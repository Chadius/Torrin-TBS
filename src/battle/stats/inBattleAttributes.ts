import {
    ArmyAttributes,
    DefaultArmyAttributes,
} from "../../squaddie/armyAttributes"
import { DamageType } from "../../squaddie/squaddieService"
import {
    AttributeModifier,
    AttributeModifierService,
    AttributeSource,
    AttributeType,
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
    ): {
        type: AttributeType
        amount: number
    }[] => {
        const addToModifierAmountByTypeIfItExceeds = (
            modifierByTypeAndSource: {
                type: AttributeType
                source: AttributeSource
                amount: number
            }[],
            howToExceed: "GreaterThan" | "LessThan",
            modifier: AttributeModifier
        ) => {
            let existingAmountByTypeAndSource = modifierByTypeAndSource.find(
                (record) =>
                    record.type === modifier.type &&
                    record.source === modifier.source
            )

            if (existingAmountByTypeAndSource === undefined) {
                existingAmountByTypeAndSource = {
                    type: modifier.type,
                    source: modifier.source,
                    amount: modifier.amount,
                }
                modifierByTypeAndSource.push(existingAmountByTypeAndSource)
                return
            }

            const exceedsBecauseItIsGreater: boolean =
                howToExceed === "GreaterThan" &&
                modifier.amount > existingAmountByTypeAndSource.amount
            const exceedsBecauseItIsLess: boolean =
                howToExceed === "LessThan" &&
                modifier.amount < existingAmountByTypeAndSource.amount

            if (exceedsBecauseItIsLess || exceedsBecauseItIsGreater) {
                existingAmountByTypeAndSource.amount = modifier.amount
            }
        }

        const positiveModifierAmountByTypeAndSource: {
            type: AttributeType
            source: AttributeSource
            amount: number
        }[] = []
        getAllActiveAttributeModifiers(attributes)
            .filter((modifier) => modifier.amount > 0)
            .forEach((modifier) => {
                addToModifierAmountByTypeIfItExceeds(
                    positiveModifierAmountByTypeAndSource,
                    "GreaterThan",
                    modifier
                )
            })

        const negativeModifierAmountByTypeAndSource: {
            type: AttributeType
            source: AttributeSource
            amount: number
        }[] = []
        getAllActiveAttributeModifiers(attributes)
            .filter((modifier) => modifier.amount < 0)
            .forEach((modifier) => {
                addToModifierAmountByTypeIfItExceeds(
                    negativeModifierAmountByTypeAndSource,
                    "LessThan",
                    modifier
                )
            })

        const combinedModifierAmountByType: {
            [t in AttributeType]?: { type: AttributeType; amount: number }
        } = {}
        const combineModifiersByType = (modifierByTypeAndSource: {
            type: AttributeType
            source: AttributeSource
            amount: number
        }) => {
            if (
                combinedModifierAmountByType[modifierByTypeAndSource.type] ===
                undefined
            ) {
                combinedModifierAmountByType[modifierByTypeAndSource.type] = {
                    type: modifierByTypeAndSource.type,
                    amount: modifierByTypeAndSource.amount,
                }
                return
            }

            combinedModifierAmountByType[modifierByTypeAndSource.type].amount +=
                modifierByTypeAndSource.amount
        }

        Object.values(positiveModifierAmountByTypeAndSource).forEach(
            combineModifiersByType
        )
        Object.values(negativeModifierAmountByTypeAndSource).forEach(
            combineModifiersByType
        )
        return Object.values(combinedModifierAmountByType).filter(
            (modifier) => modifier.amount !== 0
        )
    },
    addActiveAttributeModifier: (
        attributes: InBattleAttributes,
        attributeModifier: AttributeModifier
    ) => {
        attributes.attributeModifiers.push(attributeModifier)
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
