import { isValidValue } from "../../utils/objectValidityCheck"
import {
    Attribute,
    TAttribute,
    AttributeTypeAndAmount,
    AttributeTypeService,
} from "./attribute"
import { TextFormatService } from "../../utils/graphics/textFormatService"

export const AttributeSource = {
    PROFICIENCY: "PROFICIENCY",
    MARTIAL: "MARTIAL",
    ELEMENTAL: "ELEMENTAL",
    SPIRITUAL: "SPIRITUAL",
    CIRCUMSTANCE: "CIRCUMSTANCE",
} as const satisfies Record<string, string>
export type TAttributeSource = EnumLike<typeof AttributeSource>

export interface AttributeModifier {
    type: TAttribute
    source: TAttributeSource
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
        type: TAttribute
        source: TAttributeSource
        amount: number
        duration?: number
        numberOfUses?: number
        description?: string
    }): AttributeModifier =>
        newAttributeModifier({
            type,
            source,
            amount,
            duration,
            numberOfUses,
            description,
        }),
    isActive: (modifier: AttributeModifier): boolean => {
        switch (true) {
            case modifier.duration !== undefined && modifier.duration <= 0:
                return false
            case modifier.amount <= 0 &&
                AttributeTypeService.isBinary(modifier.type):
                return false
            case modifier.amount <= 0 && modifier.type == Attribute.ABSORB:
                return false
            case modifier.amount == 0 && modifier.type == Attribute.MOVEMENT:
                return false
            case isValidValue(modifier.numberOfUses) &&
                modifier.numberOfUses <= 0:
                return false
            default:
                return true
        }
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
    ): AttributeTypeAndAmount[] => {
        const addToModifierAmountByTypeIfItExceeds = (
            modifierByTypeAndSource: {
                type: TAttribute
                source: TAttributeSource
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
            type: TAttribute
            source: TAttributeSource
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
            type: TAttribute
            source: TAttributeSource
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
            [t in TAttribute]?: { type: TAttribute; amount: number }
        } = {}
        const combineModifiersByType = (modifierByTypeAndSource: {
            type: TAttribute
            source: TAttributeSource
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
    reduceAmount: ({
        amount,
        attributeModifier,
    }: {
        amount?: number
        attributeModifier: AttributeModifier
    }) => {
        if (attributeModifier.amount === undefined) {
            return
        }
        amount = amount ?? 1
        attributeModifier.amount -= amount
    },
    clone: (a: AttributeModifier): AttributeModifier => newAttributeModifier(a),
    readableDescription: (
        params:
            | AttributeModifier
            | {
                  amount: number
                  source?: TAttributeSource
                  type: TAttribute
              }
    ): string => {
        const attributeModifier: AttributeModifier = newAttributeModifier({
            type: params.type,
            source: params.source,
            amount: params.amount,
        })

        let attributeAmountAsString: string
        switch (true) {
            case AttributeTypeService.isBinary(attributeModifier.type):
                attributeAmountAsString = ""
                break
            case attributeModifier.amount == 0:
                attributeAmountAsString = " NO CHANGE"
                break
            default:
                attributeAmountAsString = ` ${TextFormatService.padPlusOnPositiveNumber(attributeModifier.amount)}`
                break
        }

        let attributeSourceAsString: string =
            attributeModifier.amount != 0 &&
            attributeModifier.source != undefined
                ? ` (${getReadableAttributeSource(attributeModifier.source)})`
                : ""

        const attributeTypeAsString: string = AttributeTypeService.readableName(
            attributeModifier.type
        )

        let attributeTypeDescription: string =
            attributeModifier.amount !== 0
                ? `: ${AttributeTypeService.getAttributeTypeDescription(attributeModifier.type)}`
                : ""

        return `${attributeTypeAsString}${attributeAmountAsString}${attributeSourceAsString}${attributeTypeDescription}`
    },
    readableTypeAndAmount: (attributeModifier: AttributeModifier): string => {
        let attributeAmountAsString: string
        switch (true) {
            case AttributeTypeService.isBinary(attributeModifier.type):
                attributeAmountAsString = ""
                break
            case attributeModifier.amount == 0:
                attributeAmountAsString = " (0)"
                break
            default:
                attributeAmountAsString = ` ${TextFormatService.padPlusOnPositiveNumber(attributeModifier.amount)}`
                break
        }

        return `${AttributeTypeService.readableName(attributeModifier.type)}${attributeAmountAsString}`
    },
    getReadableAttributeSource: (attributeSource: TAttributeSource): string => {
        return getReadableAttributeSource(attributeSource)
    },
}

const newAttributeModifier = ({
    type,
    source,
    amount,
    duration,
    numberOfUses,
    description,
}: {
    type: TAttribute
    source: TAttributeSource
    amount: number
    duration?: number
    numberOfUses?: number
    description?: string
}): AttributeModifier => ({
    type,
    source,
    amount,
    duration,
    numberOfUses,
    description,
})

const getReadableAttributeSource = (
    attributeSource: TAttributeSource
): string => {
    const attributeSourceToStringMapping: {
        [t in TAttributeSource]?: string
    } = {
        [AttributeSource.CIRCUMSTANCE]: "Circumstance",
        [AttributeSource.PROFICIENCY]: "Proficiency",
        [AttributeSource.MARTIAL]: "Martial",
        [AttributeSource.ELEMENTAL]: "Elemental",
        [AttributeSource.SPIRITUAL]: "Spiritual",
    }
    return attributeSourceToStringMapping[attributeSource] ?? ""
}
