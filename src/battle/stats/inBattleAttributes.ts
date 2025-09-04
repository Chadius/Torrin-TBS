import {
    ArmyAttributes,
    DefaultArmyAttributes,
} from "../../squaddie/armyAttributes"
import { TDamage } from "../../squaddie/squaddieService"
import {
    AttributeModifier,
    AttributeModifierService,
} from "../../squaddie/attribute/attributeModifier"
import {
    DamageExplanation,
    DamageExplanationService,
} from "../history/battleAction/battleActionSquaddieChange"
import { isValidValue } from "../../utils/objectValidityCheck"
import {
    Attribute,
    TAttribute,
    AttributeTypeAndAmount,
} from "../../squaddie/attribute/attribute"

export interface InBattleAttributes {
    armyAttributes: ArmyAttributes
    currentHitPoints: number
    attributeModifiers: AttributeModifier[]
    actionTemplateCooldownById: { [actionTemplateId: string]: number }
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
        return newInBattleAttributes({
            armyAttributes,
            currentHitPoints,
            attributeModifiers,
        })
    },
    takeDamage({
        inBattleAttributes,
        damageToTake,
    }: {
        inBattleAttributes: InBattleAttributes
        damageToTake: number
        damageType: TDamage
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
            willKo: inBattleAttributes.currentHitPoints <= 0,
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
            ? newInBattleAttributes({
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
        type: TAttribute
    }) {
        const attributesOfType: AttributeModifier[] =
            getAllActiveAttributeModifiers(attributes).filter(
                (a) => a.type === type
            )
        attributesOfType.forEach((attributeModifier) => {
            AttributeModifierService.reduceAmount({ attributeModifier, amount })
        })
    },
    isActionInCooldown: ({
        inBattleAttributes,
        actionTemplateId,
    }: {
        inBattleAttributes: InBattleAttributes
        actionTemplateId: string
    }): boolean => {
        return (
            (inBattleAttributes.actionTemplateCooldownById[actionTemplateId] ??
                0) > 0
        )
    },
    getActionTurnsOfCooldown: ({
        inBattleAttributes,
        actionTemplateId,
    }: {
        inBattleAttributes: InBattleAttributes
        actionTemplateId: string
    }): number => {
        return inBattleAttributes.actionTemplateCooldownById[actionTemplateId]
    },
    addActionCooldown: ({
        inBattleAttributes,
        actionTemplateId,
        numberOfCooldownTurns,
    }: {
        inBattleAttributes: InBattleAttributes
        actionTemplateId: string
        numberOfCooldownTurns: number
    }) => {
        if ((numberOfCooldownTurns ?? 0) < 1) return
        inBattleAttributes.actionTemplateCooldownById[actionTemplateId] =
            numberOfCooldownTurns
    },
    reduceActionCooldownForAllActions: ({
        inBattleAttributes,
    }: {
        inBattleAttributes: InBattleAttributes
    }) => {
        inBattleAttributes.actionTemplateCooldownById = Object.fromEntries(
            Object.entries(inBattleAttributes.actionTemplateCooldownById)
                .filter(([_, cooldownRounds]) => (cooldownRounds ?? 0) > 0)
                .map(([actionTemplateId, cooldownRounds]) => [
                    actionTemplateId,
                    cooldownRounds - 1,
                ])
        )
    },
}

const getAllActiveAttributeModifiers = (
    attributes: InBattleAttributes
): AttributeModifier[] => {
    return attributes.attributeModifiers.filter(
        AttributeModifierService.isActive
    )
}

const newInBattleAttributes = ({
    armyAttributes,
    currentHitPoints,
    attributeModifiers,
    actionTemplateCooldownById,
}: {
    armyAttributes?: ArmyAttributes
    currentHitPoints?: number
    attributeModifiers?: AttributeModifier[]
    actionTemplateCooldownById?: { [_: string]: number }
}): InBattleAttributes => {
    return {
        armyAttributes: armyAttributes || DefaultArmyAttributes(),
        currentHitPoints:
            currentHitPoints ??
            armyAttributes?.maxHitPoints ??
            DefaultArmyAttributes().maxHitPoints,
        attributeModifiers: attributeModifiers || [],
        actionTemplateCooldownById: actionTemplateCooldownById ?? {},
    }
}

const useAbsorbToReduceDamageTaken = (
    inBattleAttributes: InBattleAttributes,
    damageToTake: number
): DamageExplanation => {
    const absorbAttributeTypeAndAmount =
        InBattleAttributesService.calculateCurrentAttributeModifiers(
            inBattleAttributes
        ).find((a) => a.type === Attribute.ABSORB)

    if (absorbAttributeTypeAndAmount) {
        InBattleAttributesService.reduceAttributeByAmount({
            attributes: inBattleAttributes,
            type: Attribute.ABSORB,
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
