export enum AttributeType {
    ARMOR = "ARMOR",
}

export enum AttributeSource {
    CIRCUMSTANCE = "CIRCUMSTANCE",
}

export interface AttributeModifier {
    type: AttributeType
    source: AttributeSource
    amount: number
    duration: number | undefined
    numberOfUses: number | undefined
}

export const AttributeModifierService = {
    new: ({
        type,
        source,
        amount,
        duration,
        numberOfUses,
    }: {
        type: AttributeType
        source: AttributeSource
        amount: number
        duration?: number
        numberOfUses?: number
    }): AttributeModifier => {
        return {
            type,
            source,
            amount,
            duration,
            numberOfUses,
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
}
