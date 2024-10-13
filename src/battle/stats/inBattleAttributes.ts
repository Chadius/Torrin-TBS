import {
    ArmyAttributes,
    DefaultArmyAttributes,
} from "../../squaddie/armyAttributes"
import { DamageType } from "../../squaddie/squaddieService"
import {
    AttributeModifier,
    AttributeModifierService,
    AttributeType,
    AttributeTypeAndAmount,
} from "../../squaddie/attributeModifier"
import {
    DamageExplanation,
    DamageExplanationService,
} from "../history/battleAction/battleActionSquaddieChange"
import { isValidValue } from "../../utils/validityCheck"

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
    takeDamage({
        inBattleAttributes,
        damageToTake,
        damageType,
    }: {
        inBattleAttributes: InBattleAttributes
        damageToTake: number
        damageType: DamageType
    }): DamageExplanation {
        const startingHitPoints = inBattleAttributes.currentHitPoints
        const absorbedDamageExplanation: DamageExplanation =
            useAbsorbToReduceDamageTaken(inBattleAttributes, damageToTake)

        inBattleAttributes.currentHitPoints -= absorbedDamageExplanation.net
        if (inBattleAttributes.currentHitPoints < 0) {
            inBattleAttributes.currentHitPoints = 0
        }

        return {
            net: startingHitPoints - inBattleAttributes.currentHitPoints,
            raw: damageToTake,
            absorbed: absorbedDamageExplanation.absorbed,
        }
    },
    receiveHealing(data: InBattleAttributes, amountHealed: number): number {
        const startingHitPoints = data.currentHitPoints

        data.currentHitPoints += amountHealed
        if (data.currentHitPoints > data.armyAttributes.maxHitPoints) {
            data.currentHitPoints = data.armyAttributes.maxHitPoints
        }

        return data.currentHitPoints - startingHitPoints
    },
    clone: (inBattleAttributes: InBattleAttributes): InBattleAttributes =>
        isValidValue(inBattleAttributes)
            ? newAttributeModifier({
                  armyAttributes: inBattleAttributes.armyAttributes,
                  currentHitPoints: inBattleAttributes.currentHitPoints,
                  attributeModifiers: inBattleAttributes.attributeModifiers.map(
                      (a) => AttributeModifierService.clone(a)
                  ),
              })
            : inBattleAttributes,
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
    calculateAttributeModifiersGainedAfterChanges: (
        before: InBattleAttributes,
        after: InBattleAttributes
    ): AttributeTypeAndAmount[] => {
        const beforeAttributeTypesAndAmounts: AttributeTypeAndAmount[] = before
            ? AttributeModifierService.calculateCurrentAttributeModifiers(
                  before.attributeModifiers
              )
            : []
        const afterAttributeTypesAndAmounts: AttributeTypeAndAmount[] = after
            ? AttributeModifierService.calculateCurrentAttributeModifiers(
                  after.attributeModifiers
              )
            : []

        const differences: AttributeTypeAndAmount[] = []
        afterAttributeTypesAndAmounts.forEach(
            (afterAttributeTypesAndAmount) => {
                const beforeAttributeTypesAndAmount: AttributeTypeAndAmount =
                    beforeAttributeTypesAndAmounts.find(
                        (beforeAttributeTypesAndAmount) =>
                            beforeAttributeTypesAndAmount.type ===
                            afterAttributeTypesAndAmount.type
                    )
                if (beforeAttributeTypesAndAmount === undefined) {
                    differences.push(afterAttributeTypesAndAmount)
                    return
                }
                differences.push({
                    type: afterAttributeTypesAndAmount.type,
                    amount:
                        afterAttributeTypesAndAmount.amount -
                        beforeAttributeTypesAndAmount.amount,
                })
            }
        )
        return differences
    },
    reduceAttributeByAmount({
        attributes,
        amount,
        type,
    }: {
        attributes: InBattleAttributes
        amount: number
        type: AttributeType
    }) {
        const attributesOfType: AttributeModifier[] =
            getAllActiveAttributeModifiers(attributes).filter(
                (a) => a.type === type
            )
        attributesOfType.forEach((attributeModifier) => {
            AttributeModifierService.reduceAmount({ attributeModifier, amount })
        })
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

const useAbsorbToReduceDamageTaken = (
    inBattleAttributes: InBattleAttributes,
    damageToTake: number
): DamageExplanation => {
    const absorbAttributeTypeAndAmount =
        InBattleAttributesService.calculateCurrentAttributeModifiers(
            inBattleAttributes
        ).find((a) => a.type === AttributeType.ABSORB)

    if (absorbAttributeTypeAndAmount) {
        InBattleAttributesService.reduceAttributeByAmount({
            attributes: inBattleAttributes,
            type: AttributeType.ABSORB,
            amount: damageToTake,
        })

        const explanation: DamageExplanation = DamageExplanationService.new({
            raw: damageToTake,
        })
        if (absorbAttributeTypeAndAmount.amount >= damageToTake) {
            explanation.absorbed = damageToTake
            explanation.net = 0
        } else {
            explanation.absorbed = absorbAttributeTypeAndAmount.amount
            explanation.net = damageToTake - absorbAttributeTypeAndAmount.amount
        }
        return explanation
    }
    return DamageExplanationService.new({
        raw: damageToTake,
        net: damageToTake,
        absorbed: 0,
    })
}
