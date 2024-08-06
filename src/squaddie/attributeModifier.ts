export enum AttributeType {
    ARMOR = "ARMOR",
    TEMPORARY_HIT_POINTS = "TEMPORARY_HIT_POINTS",
}

export enum AttributeSource {
    CIRCUMSTANCE = "CIRCUMSTANCE",
    ITEM = "ITEM",
    STATUS = "STATUS",
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
}
