export enum AttributeType {
    ARMOR = "ARMOR",
    TEMPORARY_HIT_POINTS = "TEMPORARY_HIT_POINTS",
    MULTIPLE_ATTACK_PENALTY = "MULTIPLE_ATTACK_PENALTY",
}

export enum AttributeSource {
    CIRCUMSTANCE = "CIRCUMSTANCE",
    ITEM = "ITEM",
    STATUS = "STATUS",
}

export type AttributeTypeAndAmount = {
    type: AttributeType
    amount: number
}

export const AttributeTypeAndAmountService = {
    new: ({
        type,
        amount,
    }: {
        type: AttributeType
        amount: number
    }): AttributeTypeAndAmount => ({
        type,
        amount,
    }),
}

export interface AttributeModifier {
    type: AttributeType
    source: AttributeSource
    amount: number
    duration: number | undefined
    numberOfUses: number | undefined
    description: string
}

export const AttributeModifierService = {
    new: ({
        type,
        source,
        amount,
        duration,
        numberOfUses,
        description,
    }: {
        type: AttributeType
        source: AttributeSource
        amount: number
        duration?: number
        numberOfUses?: number
        description?: string
    }): AttributeModifier => {
        return {
            type,
            source,
            amount,
            duration,
            numberOfUses,
            description,
        }
    },
    isActive: (modifier: AttributeModifier): boolean => {
        if (modifier.duration !== undefined && modifier.duration <= 0) {
            return false
        }
        return !(
            modifier.numberOfUses !== undefined && modifier.numberOfUses <= 0
        )
    },
    decreaseDuration: (modifier: AttributeModifier, duration?: number) => {
        if (modifier.duration === undefined) {
            return
        }

        modifier.duration -= duration ?? 1
    },
    spendUse: (modifier: AttributeModifier) => {
        if (modifier.numberOfUses === undefined) {
            return
        }

        modifier.numberOfUses -= 1
    },
    calculateCurrentAttributeModifiers: (
        attributeModifiers: AttributeModifier[]
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
        attributeModifiers
            .filter(AttributeModifierService.isActive)
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
        attributeModifiers
            .filter(AttributeModifierService.isActive)
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
}
