import { ArmyAttributes } from "../../squaddie/armyAttributes"
import {
    InBattleAttributes,
    InBattleAttributesService,
} from "./inBattleAttributes"
import { DamageType } from "../../squaddie/squaddieService"
import { CreateNewSquaddieMovementWithTraits } from "../../squaddie/movement"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import {
    AttributeModifier,
    AttributeModifierService,
    AttributeSource,
    AttributeType,
} from "../../squaddie/attributeModifier"

describe("inBattleAttributes", () => {
    it("starts with the same hit points as maximum", () => {
        const soldierAttributes: ArmyAttributes = {
            maxHitPoints: 3,
            armorClass: 3,
            movement: CreateNewSquaddieMovementWithTraits({
                movementPerAction: 2,
            }),
        }

        const inBattleAttributes: InBattleAttributes =
            InBattleAttributesService.new({ armyAttributes: soldierAttributes })

        expect(inBattleAttributes.currentHitPoints).toBe(
            soldierAttributes.maxHitPoints
        )
    })
    it("takes damage", () => {
        const soldierAttributes: ArmyAttributes = {
            maxHitPoints: 3,
            armorClass: 3,
            movement: CreateNewSquaddieMovementWithTraits({
                movementPerAction: 2,
            }),
        }

        const inBattleAttributes: InBattleAttributes =
            InBattleAttributesService.new({ armyAttributes: soldierAttributes })
        const actualDamageTaken = InBattleAttributesService.takeDamage(
            inBattleAttributes,
            2,
            DamageType.BODY
        )

        expect(actualDamageTaken).toBe(2)
        expect(inBattleAttributes.currentHitPoints).toBe(
            soldierAttributes.maxHitPoints - actualDamageTaken
        )
    })
    it("cannot take more than maximum hit points of damage", () => {
        const soldierAttributes: ArmyAttributes = {
            maxHitPoints: 3,
            armorClass: 3,
            movement: CreateNewSquaddieMovementWithTraits({
                movementPerAction: 2,
            }),
        }

        const inBattleAttributes: InBattleAttributes =
            InBattleAttributesService.new({ armyAttributes: soldierAttributes })
        const actualDamageTaken = InBattleAttributesService.takeDamage(
            inBattleAttributes,
            9001,
            DamageType.BODY
        )

        expect(actualDamageTaken).toBe(soldierAttributes.maxHitPoints)
        expect(inBattleAttributes.currentHitPoints).toBe(0)
    })
    it("receive healing up to maximum", () => {
        const soldierAttributes: ArmyAttributes = {
            maxHitPoints: 3,
            armorClass: 3,
            movement: CreateNewSquaddieMovementWithTraits({
                movementPerAction: 2,
            }),
        }

        const inBattleAttributes: InBattleAttributes =
            InBattleAttributesService.new({ armyAttributes: soldierAttributes })
        InBattleAttributesService.takeDamage(
            inBattleAttributes,
            2,
            DamageType.BODY
        )
        const actualAmountHealed = InBattleAttributesService.receiveHealing(
            inBattleAttributes,
            9001
        )

        expect(actualAmountHealed).toBe(2)
        expect(inBattleAttributes.currentHitPoints).toBe(
            soldierAttributes.maxHitPoints
        )
    })
    it("can clone", () => {
        const soldierAttributes: ArmyAttributes = {
            maxHitPoints: 3,
            armorClass: 3,
            movement: CreateNewSquaddieMovementWithTraits({
                movementPerAction: 2,
            }),
        }

        const original: InBattleAttributes = InBattleAttributesService.new({
            armyAttributes: soldierAttributes,
        })

        const clone: InBattleAttributes =
            InBattleAttributesService.clone(original)

        expect(clone).toEqual(original)
        expect(clone.currentHitPoints).toBe(soldierAttributes.maxHitPoints)
    })

    describe("AttributeModifiers", () => {
        let attributes: InBattleAttributes
        beforeEach(() => {
            attributes = InBattleAttributesService.new({
                armyAttributes: {
                    armorClass: 3,
                    maxHitPoints: 5,
                    movement: CreateNewSquaddieMovementWithTraits({
                        movementPerAction: 2,
                        traits: TraitStatusStorageService.newUsingTraitValues({
                            [Trait.PASS_THROUGH_WALLS]: true,
                        }),
                    }),
                },
            })
        })

        it("starts with no modifiers", () => {
            expect(
                InBattleAttributesService.getAllActiveAttributeModifiers(
                    attributes
                )
            ).toHaveLength(0)
            expect(
                InBattleAttributesService.calculateCurrentAttributeModifiers(
                    attributes
                )
            ).toHaveLength(0)
        })
        it("can add modifiers and return individual modifiers", () => {
            const armorAttributeModifier = AttributeModifierService.new({
                type: AttributeType.ARMOR,
                source: AttributeSource.CIRCUMSTANCE,
                amount: 2,
                description: "bonus armor",
            })
            InBattleAttributesService.addActiveAttributeModifier(
                attributes,
                armorAttributeModifier
            )

            expect(
                InBattleAttributesService.getAllActiveAttributeModifiers(
                    attributes
                )
            ).toEqual([armorAttributeModifier])
        })
        describe("can calculate the net effect of modifiers", () => {
            let armorCircumstance: AttributeModifier
            let armorItem: AttributeModifier
            let tempHitPointCircumstance: AttributeModifier
            let armorCircumstancePenalty: AttributeModifier
            let bigArmorCircumstancePenalty: AttributeModifier

            beforeEach(() => {
                armorCircumstance = AttributeModifierService.new({
                    type: AttributeType.ARMOR,
                    source: AttributeSource.CIRCUMSTANCE,
                    amount: 1,
                    description: "Raise A Shield",
                })
                armorItem = AttributeModifierService.new({
                    type: AttributeType.ARMOR,
                    source: AttributeSource.ITEM,
                    amount: 2,
                    description: "Magic Armor Plating",
                })
                tempHitPointCircumstance = AttributeModifierService.new({
                    type: AttributeType.TEMPORARY_HIT_POINTS,
                    source: AttributeSource.CIRCUMSTANCE,
                    amount: 3,
                    description: "Inspirational Speech",
                })
                armorCircumstancePenalty = AttributeModifierService.new({
                    type: AttributeType.ARMOR,
                    source: AttributeSource.CIRCUMSTANCE,
                    amount: -1,
                })
                bigArmorCircumstancePenalty = AttributeModifierService.new({
                    type: AttributeType.ARMOR,
                    source: AttributeSource.CIRCUMSTANCE,
                    amount: -2,
                })
            })
            it("if modifiers are the same type and source then only the greater positive amount is used", () => {
                InBattleAttributesService.addActiveAttributeModifier(
                    attributes,
                    armorCircumstance
                )

                const bigArmorCircumstance: AttributeModifier = {
                    ...armorCircumstance,
                }
                bigArmorCircumstance.amount = armorCircumstance.amount + 1

                InBattleAttributesService.addActiveAttributeModifier(
                    attributes,
                    bigArmorCircumstance
                )

                expect(
                    InBattleAttributesService.calculateCurrentAttributeModifiers(
                        attributes
                    )
                ).toEqual([
                    {
                        type: AttributeType.ARMOR,
                        amount: bigArmorCircumstance.amount,
                    },
                ])
            })
            it("if modifiers are the same type and source then only the smaller negative amount is used", () => {
                InBattleAttributesService.addActiveAttributeModifier(
                    attributes,
                    armorCircumstancePenalty
                )

                InBattleAttributesService.addActiveAttributeModifier(
                    attributes,
                    bigArmorCircumstancePenalty
                )

                expect(
                    InBattleAttributesService.calculateCurrentAttributeModifiers(
                        attributes
                    )
                ).toEqual([
                    {
                        type: AttributeType.ARMOR,
                        amount: bigArmorCircumstancePenalty.amount,
                    },
                ])
            })
            it("if modifiers are the same type and source combine positive and negative values", () => {
                InBattleAttributesService.addActiveAttributeModifier(
                    attributes,
                    armorCircumstance
                )

                InBattleAttributesService.addActiveAttributeModifier(
                    attributes,
                    bigArmorCircumstancePenalty
                )

                expect(
                    InBattleAttributesService.calculateCurrentAttributeModifiers(
                        attributes
                    )
                ).toEqual([
                    {
                        type: AttributeType.ARMOR,
                        amount:
                            bigArmorCircumstancePenalty.amount +
                            armorCircumstance.amount,
                    },
                ])
            })
            it("if modifiers cancel each other out do not report them in calculation", () => {
                expect(
                    armorCircumstancePenalty.amount + armorCircumstance.amount
                ).toEqual(0)

                InBattleAttributesService.addActiveAttributeModifier(
                    attributes,
                    armorCircumstance
                )

                InBattleAttributesService.addActiveAttributeModifier(
                    attributes,
                    armorCircumstancePenalty
                )

                expect(
                    InBattleAttributesService.calculateCurrentAttributeModifiers(
                        attributes
                    )
                ).toHaveLength(0)
            })
            it("if modifiers are the same type but different source then the amounts are combined", () => {
                InBattleAttributesService.addActiveAttributeModifier(
                    attributes,
                    armorCircumstance
                )
                InBattleAttributesService.addActiveAttributeModifier(
                    attributes,
                    armorItem
                )

                expect(
                    InBattleAttributesService.calculateCurrentAttributeModifiers(
                        attributes
                    )
                ).toEqual([
                    {
                        type: AttributeType.ARMOR,
                        amount: armorCircumstance.amount + armorItem.amount,
                    },
                ])
            })
            it("if modifiers are different types then both modifiers are reported", () => {
                InBattleAttributesService.addActiveAttributeModifier(
                    attributes,
                    armorCircumstance
                )
                InBattleAttributesService.addActiveAttributeModifier(
                    attributes,
                    tempHitPointCircumstance
                )

                expect(
                    InBattleAttributesService.calculateCurrentAttributeModifiers(
                        attributes
                    )
                ).toHaveLength(2)
                expect(
                    InBattleAttributesService.calculateCurrentAttributeModifiers(
                        attributes
                    )
                ).toEqual(
                    expect.arrayContaining([
                        {
                            type: AttributeType.ARMOR,
                            amount: armorCircumstance.amount,
                        },
                        {
                            type: AttributeType.TEMPORARY_HIT_POINTS,
                            amount: tempHitPointCircumstance.amount,
                        },
                    ])
                )
            })
            it("ignores inactive modifiers", () => {
                InBattleAttributesService.addActiveAttributeModifier(
                    attributes,
                    armorCircumstance
                )

                const expiredArmorItem: AttributeModifier =
                    AttributeModifierService.new({
                        type: AttributeType.ARMOR,
                        source: AttributeSource.ITEM,
                        amount: 9001,
                        duration: 0,
                    })
                expect(
                    AttributeModifierService.isActive(expiredArmorItem)
                ).toBeFalsy()

                InBattleAttributesService.addActiveAttributeModifier(
                    attributes,
                    expiredArmorItem
                )

                expect(
                    InBattleAttributesService.calculateCurrentAttributeModifiers(
                        attributes
                    )
                ).toEqual([
                    {
                        type: AttributeType.ARMOR,
                        amount: armorCircumstance.amount,
                    },
                ])
            })
        })
        it("can decrement based on duration", () => {
            const armorModifierFor3Rounds = AttributeModifierService.new({
                type: AttributeType.ARMOR,
                source: AttributeSource.CIRCUMSTANCE,
                amount: 1,
                duration: 3,
                description: "Blessing of Protection",
            })
            InBattleAttributesService.addActiveAttributeModifier(
                attributes,
                armorModifierFor3Rounds
            )

            const armorModifierFor1Round = AttributeModifierService.new({
                type: AttributeType.ARMOR,
                source: AttributeSource.ITEM,
                amount: 2,
                duration: 1,
                description: "Raise A Shield",
            })
            InBattleAttributesService.addActiveAttributeModifier(
                attributes,
                armorModifierFor1Round
            )

            const unlimitedArmorModifier = AttributeModifierService.new({
                type: AttributeType.ARMOR,
                source: AttributeSource.STATUS,
                amount: 3,
                description: "Objective Complete",
            })
            InBattleAttributesService.addActiveAttributeModifier(
                attributes,
                unlimitedArmorModifier
            )

            expect(
                InBattleAttributesService.getAllActiveAttributeModifiers(
                    attributes
                )
            ).toEqual(
                expect.arrayContaining([
                    armorModifierFor1Round,
                    armorModifierFor3Rounds,
                    unlimitedArmorModifier,
                ])
            )
            expect(
                InBattleAttributesService.getAllActiveAttributeModifiers(
                    attributes
                )
            ).toHaveLength(3)

            InBattleAttributesService.decreaseModifiersBy1Round(attributes)
            expect(
                InBattleAttributesService.getAllActiveAttributeModifiers(
                    attributes
                )
            ).toEqual(
                expect.arrayContaining([
                    armorModifierFor3Rounds,
                    unlimitedArmorModifier,
                ])
            )
            expect(armorModifierFor3Rounds.duration).toEqual(2)
            expect(
                InBattleAttributesService.getAllActiveAttributeModifiers(
                    attributes
                )
            ).toHaveLength(2)

            InBattleAttributesService.decreaseModifiersBy1Round(attributes)
            expect(
                InBattleAttributesService.getAllActiveAttributeModifiers(
                    attributes
                )
            ).toEqual(
                expect.arrayContaining([
                    armorModifierFor3Rounds,
                    unlimitedArmorModifier,
                ])
            )
            expect(
                InBattleAttributesService.getAllActiveAttributeModifiers(
                    attributes
                )
            ).toHaveLength(2)

            InBattleAttributesService.decreaseModifiersBy1Round(attributes)
            expect(
                InBattleAttributesService.getAllActiveAttributeModifiers(
                    attributes
                )
            ).toEqual(expect.arrayContaining([unlimitedArmorModifier]))
            expect(
                InBattleAttributesService.getAllActiveAttributeModifiers(
                    attributes
                )
            ).toHaveLength(1)
        })
        it("can spend uses on modifiers", () => {
            const armorModifierFor3Uses = AttributeModifierService.new({
                type: AttributeType.ARMOR,
                source: AttributeSource.CIRCUMSTANCE,
                amount: 1,
                numberOfUses: 3,
                description: "Divine Interventions",
            })
            InBattleAttributesService.addActiveAttributeModifier(
                attributes,
                armorModifierFor3Uses
            )

            const armorModifierFor1Use = AttributeModifierService.new({
                type: AttributeType.ARMOR,
                source: AttributeSource.ITEM,
                amount: 2,
                numberOfUses: 1,
                description: "Shield Block",
            })
            InBattleAttributesService.addActiveAttributeModifier(
                attributes,
                armorModifierFor1Use
            )

            const unlimitedArmorModifier = AttributeModifierService.new({
                type: AttributeType.ARMOR,
                source: AttributeSource.STATUS,
                amount: 3,
                description: "Objective Complete",
            })
            InBattleAttributesService.addActiveAttributeModifier(
                attributes,
                unlimitedArmorModifier
            )

            expect(
                InBattleAttributesService.getAllActiveAttributeModifiers(
                    attributes
                )
            ).toEqual(
                expect.arrayContaining([
                    armorModifierFor1Use,
                    armorModifierFor3Uses,
                    unlimitedArmorModifier,
                ])
            )
            expect(
                InBattleAttributesService.getAllActiveAttributeModifiers(
                    attributes
                )
            ).toHaveLength(3)

            InBattleAttributesService.spend1UseOnModifiers(attributes)
            expect(
                InBattleAttributesService.getAllActiveAttributeModifiers(
                    attributes
                )
            ).toEqual(
                expect.arrayContaining([
                    armorModifierFor3Uses,
                    unlimitedArmorModifier,
                ])
            )
            expect(
                InBattleAttributesService.getAllActiveAttributeModifiers(
                    attributes
                )
            ).toHaveLength(2)

            InBattleAttributesService.spend1UseOnModifiers(attributes)
            expect(
                InBattleAttributesService.getAllActiveAttributeModifiers(
                    attributes
                )
            ).toEqual(
                expect.arrayContaining([
                    armorModifierFor3Uses,
                    unlimitedArmorModifier,
                ])
            )
            expect(
                InBattleAttributesService.getAllActiveAttributeModifiers(
                    attributes
                )
            ).toHaveLength(2)

            InBattleAttributesService.spend1UseOnModifiers(attributes)
            expect(
                InBattleAttributesService.getAllActiveAttributeModifiers(
                    attributes
                )
            ).toEqual(expect.arrayContaining([unlimitedArmorModifier]))
            expect(
                InBattleAttributesService.getAllActiveAttributeModifiers(
                    attributes
                )
            ).toHaveLength(1)
        })
        describe("inactive modifiers", () => {
            let activeModifier: AttributeModifier
            let modifierWithInactiveDuration: AttributeModifier
            let modifierWithAllUsesSpent: AttributeModifier

            beforeEach(() => {
                activeModifier = AttributeModifierService.new({
                    type: AttributeType.ARMOR,
                    source: AttributeSource.CIRCUMSTANCE,
                    amount: 1,
                    duration: 1,
                })
                modifierWithInactiveDuration = AttributeModifierService.new({
                    type: AttributeType.ARMOR,
                    source: AttributeSource.CIRCUMSTANCE,
                    amount: 1,
                    duration: 0,
                })
                modifierWithAllUsesSpent = AttributeModifierService.new({
                    type: AttributeType.ARMOR,
                    source: AttributeSource.CIRCUMSTANCE,
                    amount: 1,
                    numberOfUses: 0,
                })
            })

            it("can return active modifiers, even if inactive modifiers exist", () => {
                InBattleAttributesService.addActiveAttributeModifier(
                    attributes,
                    activeModifier
                )
                InBattleAttributesService.addActiveAttributeModifier(
                    attributes,
                    modifierWithInactiveDuration
                )
                InBattleAttributesService.addActiveAttributeModifier(
                    attributes,
                    modifierWithAllUsesSpent
                )

                expect(
                    InBattleAttributesService.getAllActiveAttributeModifiers(
                        attributes
                    )
                ).toEqual([activeModifier])
            })
            it("can remove inactive modifiers", () => {
                InBattleAttributesService.addActiveAttributeModifier(
                    attributes,
                    activeModifier
                )
                InBattleAttributesService.addActiveAttributeModifier(
                    attributes,
                    modifierWithInactiveDuration
                )
                InBattleAttributesService.addActiveAttributeModifier(
                    attributes,
                    modifierWithAllUsesSpent
                )

                expect(attributes.attributeModifiers).toEqual(
                    expect.arrayContaining([
                        activeModifier,
                        modifierWithAllUsesSpent,
                        modifierWithInactiveDuration,
                    ])
                )

                InBattleAttributesService.removeInactiveAttributeModifiers(
                    attributes
                )

                expect(attributes.attributeModifiers).toEqual([activeModifier])
            })
        })
    })
})
