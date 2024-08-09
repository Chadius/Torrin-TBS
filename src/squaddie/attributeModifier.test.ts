import {
    AttributeModifier,
    AttributeModifierService,
    AttributeSource,
    AttributeType,
} from "./attributeModifier"

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
})
