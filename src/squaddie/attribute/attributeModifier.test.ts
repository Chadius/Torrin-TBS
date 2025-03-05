import {
    AttributeModifier,
    AttributeModifierService,
    AttributeSource,
} from "./attributeModifier"
import { beforeEach, describe, expect, it, test } from "vitest"
import { AttributeType } from "./attributeType"

describe("AttributeModifier", () => {
    let armorModifierFor1Round: AttributeModifier

    beforeEach(() => {
        armorModifierFor1Round = AttributeModifierService.new({
            type: AttributeType.ARMOR,
            source: AttributeSource.CIRCUMSTANCE,
            amount: 2,
            duration: 1,
            description: "Raise a Shield",
        })
    })

    it("Can create a new modifier with a given duration", () => {
        expect(armorModifierFor1Round.amount).toEqual(2)
        expect(armorModifierFor1Round.duration).toEqual(1)
        expect(armorModifierFor1Round.description).toEqual("Raise a Shield")
    })
    it("Can create a new modifier with a given number of applications", () => {
        const armorModifierFor3Uses: AttributeModifier =
            AttributeModifierService.new({
                type: AttributeType.ARMOR,
                source: AttributeSource.CIRCUMSTANCE,
                amount: 2,
                numberOfUses: 3,
            })

        expect(armorModifierFor3Uses.numberOfUses).toEqual(3)
        expect(armorModifierFor3Uses.duration).toBeUndefined()
    })
    it("Can tell if the modifier is active", () => {
        expect(
            AttributeModifierService.isActive(armorModifierFor1Round)
        ).toBeTruthy()
    })
    it("Can decrement duration and mark modifiers as inactive", () => {
        AttributeModifierService.decreaseDuration(armorModifierFor1Round, 2)
        expect(
            AttributeModifierService.isActive(armorModifierFor1Round)
        ).toBeFalsy()
    })
    it("Can decrement duration by a given amount and mark modifiers as inactive", () => {
        const armorModifierFor3Rounds = AttributeModifierService.new({
            type: AttributeType.ARMOR,
            source: AttributeSource.CIRCUMSTANCE,
            amount: 2,
            duration: 3,
        })

        AttributeModifierService.decreaseDuration(armorModifierFor3Rounds, 2)
        expect(armorModifierFor3Rounds.duration).toEqual(1)
        expect(
            AttributeModifierService.isActive(armorModifierFor1Round)
        ).toBeTruthy()

        AttributeModifierService.decreaseDuration(armorModifierFor3Rounds, 2)
        expect(
            AttributeModifierService.isActive(armorModifierFor3Rounds)
        ).toBeFalsy()
    })
    it("Can decrement number of applications and mark modifiers as inactive", () => {
        const armorModifierFor1Use = AttributeModifierService.new({
            type: AttributeType.ARMOR,
            source: AttributeSource.CIRCUMSTANCE,
            amount: 2,
            numberOfUses: 2,
        })

        AttributeModifierService.spendUse(armorModifierFor1Use)
        expect(
            AttributeModifierService.isActive(armorModifierFor1Use)
        ).toBeTruthy()

        AttributeModifierService.spendUse(armorModifierFor1Use)
        expect(
            AttributeModifierService.isActive(armorModifierFor1Use)
        ).toBeFalsy()
    })
    it("Can decrement the amount", () => {
        const absorbModifierFor3Amount = AttributeModifierService.new({
            type: AttributeType.ABSORB,
            source: AttributeSource.CIRCUMSTANCE,
            amount: 3,
        })

        AttributeModifierService.reduceAmount({
            attributeModifier: absorbModifierFor3Amount,
            amount: 2,
        })
        expect(
            AttributeModifierService.isActive(absorbModifierFor3Amount)
        ).toBeTruthy()
        expect(absorbModifierFor3Amount.amount).toEqual(1)

        AttributeModifierService.reduceAmount({
            attributeModifier: absorbModifierFor3Amount,
        })
        expect(absorbModifierFor3Amount.amount).toEqual(0)
        expect(
            AttributeModifierService.isActive(absorbModifierFor3Amount)
        ).toBeFalsy()
    })
    describe("expect some attribute types to be inactive when amount is 0", () => {
        const tests = [
            {
                type: AttributeType.ARMOR,
                shouldBeActive: true,
            },
            {
                type: AttributeType.ABSORB,
                shouldBeActive: false,
            },
            {
                type: AttributeType.MOVEMENT,
                shouldBeActive: false,
            },
            {
                type: AttributeType.HUSTLE,
                shouldBeActive: false,
            },
            {
                type: AttributeType.ELUSIVE,
                shouldBeActive: false,
            },
        ]

        it.each(tests)(
            `$type should be: $shouldBeInactive`,
            ({ type, shouldBeActive }) => {
                const attributeModifier = AttributeModifierService.new({
                    type,
                    amount: 0,
                    source: AttributeSource.CIRCUMSTANCE,
                })
                expect(
                    AttributeModifierService.isActive(attributeModifier)
                ).toEqual(shouldBeActive)
            }
        )
    })
    it("Ignores decrements if duration or uses are not applicable", () => {
        const unlimitedModifier = AttributeModifierService.new({
            type: AttributeType.ARMOR,
            source: AttributeSource.CIRCUMSTANCE,
            amount: 2,
        })

        AttributeModifierService.spendUse(unlimitedModifier)
        AttributeModifierService.decreaseDuration(unlimitedModifier, 9001)
        expect(
            AttributeModifierService.isActive(unlimitedModifier)
        ).toBeTruthy()
    })

    describe("calculateCurrentAttributeModifiers", () => {
        let attributeModifiers: AttributeModifier[]
        beforeEach(() => {
            attributeModifiers = []
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
                    type: AttributeType.ABSORB,
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
                attributeModifiers.push(armorCircumstance)

                const bigArmorCircumstance: AttributeModifier = {
                    ...armorCircumstance,
                }
                bigArmorCircumstance.amount = armorCircumstance.amount + 1

                attributeModifiers.push(bigArmorCircumstance)

                expect(
                    AttributeModifierService.calculateCurrentAttributeModifiers(
                        attributeModifiers
                    )
                ).toEqual([
                    {
                        type: AttributeType.ARMOR,
                        amount: bigArmorCircumstance.amount,
                    },
                ])
            })
            it("if modifiers are the same type and source then only the smaller negative amount is used", () => {
                attributeModifiers.push(armorCircumstancePenalty)

                attributeModifiers.push(bigArmorCircumstancePenalty)

                expect(
                    AttributeModifierService.calculateCurrentAttributeModifiers(
                        attributeModifiers
                    )
                ).toEqual([
                    {
                        type: AttributeType.ARMOR,
                        amount: bigArmorCircumstancePenalty.amount,
                    },
                ])
            })
            it("if modifiers are the same type and source combine positive and negative values", () => {
                attributeModifiers.push(armorCircumstance)

                attributeModifiers.push(bigArmorCircumstancePenalty)

                expect(
                    AttributeModifierService.calculateCurrentAttributeModifiers(
                        attributeModifiers
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

                attributeModifiers.push(armorCircumstance)

                attributeModifiers.push(armorCircumstancePenalty)

                expect(
                    AttributeModifierService.calculateCurrentAttributeModifiers(
                        attributeModifiers
                    )
                ).toHaveLength(0)
            })
            it("if modifiers are the same type but different source then the amounts are combined", () => {
                attributeModifiers.push(armorCircumstance)
                attributeModifiers.push(armorItem)

                expect(
                    AttributeModifierService.calculateCurrentAttributeModifiers(
                        attributeModifiers
                    )
                ).toEqual([
                    {
                        type: AttributeType.ARMOR,
                        amount: armorCircumstance.amount + armorItem.amount,
                    },
                ])
            })
            it("if modifiers are different types then both modifiers are reported", () => {
                attributeModifiers.push(armorCircumstance)
                attributeModifiers.push(tempHitPointCircumstance)

                expect(
                    AttributeModifierService.calculateCurrentAttributeModifiers(
                        attributeModifiers
                    )
                ).toHaveLength(2)
                expect(
                    AttributeModifierService.calculateCurrentAttributeModifiers(
                        attributeModifiers
                    )
                ).toEqual(
                    expect.arrayContaining([
                        {
                            type: AttributeType.ARMOR,
                            amount: armorCircumstance.amount,
                        },
                        {
                            type: AttributeType.ABSORB,
                            amount: tempHitPointCircumstance.amount,
                        },
                    ])
                )
            })
            it("ignores inactive modifiers", () => {
                attributeModifiers.push(armorCircumstance)

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

                attributeModifiers.push(expiredArmorItem)

                expect(
                    AttributeModifierService.calculateCurrentAttributeModifiers(
                        attributeModifiers
                    )
                ).toEqual([
                    {
                        type: AttributeType.ARMOR,
                        amount: armorCircumstance.amount,
                    },
                ])
            })
        })
    })

    describe("knows how to make attribute descriptions", () => {
        const readableDescription: { [t: string]: string } = {
            [`${AttributeType.ARMOR} ${AttributeSource.CIRCUMSTANCE}`]:
                "Armor -1 (Circumstance): Harder to hit",
            [AttributeType.ABSORB]: "Absorb +2 (Item): Temporary HP",
            [AttributeType.MOVEMENT]: "Movement NO CHANGE",
            [AttributeType.HUSTLE]:
                "Hustle (Circumstance): Ignore rough terrain movement cost",
            [AttributeType.ELUSIVE]:
                "Elusive (Status): Can pass through enemies",
            [`${AttributeType.ARMOR} ${AttributeSource.PROFICIENCY}`]:
                "Armor +4 (Proficiency): Harder to hit",
        }

        test.each`
            attributeType             | amount | source                          | readableDescription
            ${AttributeType.ARMOR}    | ${-1}  | ${AttributeSource.CIRCUMSTANCE} | ${readableDescription[`${AttributeType.ARMOR} ${AttributeSource.CIRCUMSTANCE}`]}
            ${AttributeType.ABSORB}   | ${2}   | ${AttributeSource.ITEM}         | ${readableDescription[AttributeType.ABSORB]}
            ${AttributeType.MOVEMENT} | ${0}   | ${AttributeSource.STATUS}       | ${readableDescription[AttributeType.MOVEMENT]}
            ${AttributeType.ARMOR}    | ${4}   | ${AttributeSource.PROFICIENCY}  | ${readableDescription[`${AttributeType.ARMOR} ${AttributeSource.PROFICIENCY}`]}
        `(
            "$attributeType $amount $source description is: $readableDescription",
            ({ attributeType, amount, source, readableDescription }) => {
                expect(
                    AttributeModifierService.readableDescription(
                        AttributeModifierService.new({
                            type: attributeType,
                            source: source,
                            amount: amount,
                        })
                    )
                ).toEqual(readableDescription)
            }
        )

        test.each`
            attributeType            | source                          | readableDescription
            ${AttributeType.HUSTLE}  | ${AttributeSource.CIRCUMSTANCE} | ${readableDescription[AttributeType.HUSTLE]}
            ${AttributeType.ELUSIVE} | ${AttributeSource.STATUS}       | ${readableDescription[AttributeType.ELUSIVE]}
        `(
            "$attributeType $source description is: $readableDescription",
            ({ attributeType, source, readableDescription }) => {
                expect(
                    AttributeModifierService.readableDescription(
                        AttributeModifierService.new({
                            type: attributeType,
                            source: source,
                            amount: 1,
                        })
                    )
                ).toEqual(readableDescription)
            }
        )

        it("can manually specify fields", () => {
            expect(
                AttributeModifierService.readableDescription({
                    type: AttributeType.MOVEMENT,
                    source: AttributeSource.CIRCUMSTANCE,
                    amount: 0,
                })
            ).toEqual("Movement NO CHANGE")

            expect(
                AttributeModifierService.readableDescription({
                    type: AttributeType.ABSORB,
                    amount: 1,
                })
            ).toEqual("Absorb +1: Temporary HP")
        })
    })
})
