import { ArmyAttributes, ArmyAttributesService } from "./armyAttributes"

describe("sanitize", () => {
    it("can be sanitized to fill in missing fields", () => {
        const attributesWithMissingFields: ArmyAttributes = {
            maxHitPoints: NaN,
            armorClass: null,
            movement: undefined,
            tier: undefined,
        }
        ArmyAttributesService.sanitize(attributesWithMissingFields)
        const defaultAttributes = ArmyAttributesService.default()

        expect(attributesWithMissingFields.maxHitPoints).toEqual(
            defaultAttributes.maxHitPoints
        )
        expect(attributesWithMissingFields.armorClass).toEqual(
            defaultAttributes.armorClass
        )
        expect(attributesWithMissingFields.movement).toEqual(
            defaultAttributes.movement
        )
        expect(attributesWithMissingFields.tier).toEqual(defaultAttributes.tier)
    })
    it("will sanitize and give default maximum hit points if maxHitPoints is non positive", () => {
        const attributesWithNoHitPoints: ArmyAttributes = {
            maxHitPoints: 0,
            armorClass: null,
            movement: undefined,
            tier: undefined,
        }
        ArmyAttributesService.sanitize(attributesWithNoHitPoints)
        const defaultAttributes = ArmyAttributesService.default()

        expect(attributesWithNoHitPoints.maxHitPoints).toEqual(
            defaultAttributes.maxHitPoints
        )
    })
    it("will use default values if they are not given", () => {
        const attributes: ArmyAttributes = ArmyAttributesService.new({})
        expect(attributes.maxHitPoints).toEqual(
            ArmyAttributesService.default().maxHitPoints
        )
        expect(attributes.armorClass).toEqual(
            ArmyAttributesService.default().armorClass
        )
        expect(attributes.tier).toEqual(ArmyAttributesService.default().tier)
    })
})
