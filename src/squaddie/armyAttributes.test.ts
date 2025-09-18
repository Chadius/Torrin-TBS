import {
    ArmyAttributes,
    ArmyAttributesService,
    ProficiencyLevel,
} from "./armyAttributes"
import { describe, expect, it } from "vitest"
import { VersusSquaddieResistance } from "../action/template/actionEffectTemplate"

describe("sanitize", () => {
    it("can be sanitized to fill in missing fields", () => {
        const attributesWithMissingFields: ArmyAttributes = {
            maxHitPoints: NaN,
            // @ts-ignore adding invalid value intentionally so I can test sanitization
            armor: null,
            // @ts-ignore adding invalid value intentionally so I can test sanitization
            movement: undefined,
            // @ts-ignore adding invalid value intentionally so I can test sanitization
            tier: undefined,
            // @ts-ignore adding invalid value intentionally so I can test sanitization
            versusProficiencyLevels: undefined,
        }
        ArmyAttributesService.sanitize(attributesWithMissingFields)
        const defaultAttributes = ArmyAttributesService.default()

        expect(attributesWithMissingFields.maxHitPoints).toEqual(
            defaultAttributes.maxHitPoints
        )
        expect(attributesWithMissingFields.armor).toEqual(
            defaultAttributes.armor
        )
        expect(attributesWithMissingFields.movement).toEqual(
            defaultAttributes.movement
        )
        expect(attributesWithMissingFields.tier).toEqual(defaultAttributes.tier)
        expect(attributesWithMissingFields.versusProficiencyLevels).toEqual({
            [VersusSquaddieResistance.ARMOR]: ProficiencyLevel.UNTRAINED,
            [VersusSquaddieResistance.BODY]: ProficiencyLevel.UNTRAINED,
            [VersusSquaddieResistance.MIND]: ProficiencyLevel.UNTRAINED,
            [VersusSquaddieResistance.SOUL]: ProficiencyLevel.UNTRAINED,
            [VersusSquaddieResistance.OTHER]: ProficiencyLevel.UNTRAINED,
        })
    })
    it("will sanitize and give default maximum hit points if maxHitPoints is non positive", () => {
        const attributesWithNoHitPoints: ArmyAttributes = {
            maxHitPoints: 0,
            // @ts-ignore adding invalid value intentionally so I can test sanitization
            armor: null,
            // @ts-ignore adding invalid value intentionally so I can test sanitization
            movement: undefined,
            // @ts-ignore adding invalid value intentionally so I can test sanitization
            tier: undefined,
            // @ts-ignore adding invalid value intentionally so I can test sanitization
            versusProficiencyLevels: undefined,
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
        expect(attributes.armor).toEqual(ArmyAttributesService.default().armor)
        expect(attributes.tier).toEqual(ArmyAttributesService.default().tier)
        expect(attributes.versusProficiencyLevels).toEqual(
            ArmyAttributesService.default().versusProficiencyLevels
        )
    })
    it("will create attributes with the given arguments", () => {
        const attributes: ArmyAttributes = ArmyAttributesService.new({
            maxHitPoints: 10,
            tier: 2,
            armor: {
                proficiencyLevel: ProficiencyLevel.NOVICE,
                base: 3,
            },
            versusProficiencyLevels: {
                [VersusSquaddieResistance.ARMOR]: ProficiencyLevel.MASTER,
            },
        })
        expect(attributes.maxHitPoints).toEqual(10)
        expect(attributes.armor.proficiencyLevel).toEqual(
            ProficiencyLevel.NOVICE
        )
        expect(attributes.armor.base).toEqual(3)
        expect(attributes.tier).toEqual(2)
        expect(attributes.versusProficiencyLevels.ARMOR).toEqual(
            ProficiencyLevel.MASTER
        )
    })
})
