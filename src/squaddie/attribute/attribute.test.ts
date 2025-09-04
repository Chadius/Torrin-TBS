import { describe, expect, it, test } from "vitest"
import { Attribute, TAttribute, AttributeTypeService } from "./attribute"

describe("Attribute Type", () => {
    describe("knows when the attribute is binary", () => {
        const binaryStatus: { [t in TAttribute]: boolean } = {
            [Attribute.ARMOR]: false,
            [Attribute.ABSORB]: false,
            [Attribute.MOVEMENT]: false,
            [Attribute.HUSTLE]: true,
            [Attribute.ELUSIVE]: true,
        }

        test.each`
            attributeType         | isBinary
            ${Attribute.ARMOR}    | ${binaryStatus[Attribute.ARMOR]}
            ${Attribute.ABSORB}   | ${binaryStatus[Attribute.ABSORB]}
            ${Attribute.MOVEMENT} | ${binaryStatus[Attribute.MOVEMENT]}
            ${Attribute.HUSTLE}   | ${binaryStatus[Attribute.HUSTLE]}
            ${Attribute.ELUSIVE}  | ${binaryStatus[Attribute.ELUSIVE]}
        `(
            "$attributeType is binary: $isBinary",
            ({ attributeType, isBinary }) => {
                expect(AttributeTypeService.isBinary(attributeType)).toEqual(
                    isBinary
                )
            }
        )
    })
    describe("knows the attribute readable names", () => {
        const readableName: { [t in TAttribute]: string } = {
            [Attribute.ARMOR]: "Armor",
            [Attribute.ABSORB]: "Absorb",
            [Attribute.MOVEMENT]: "Movement",
            [Attribute.HUSTLE]: "Hustle",
            [Attribute.ELUSIVE]: "Elusive",
        }

        test.each`
            attributeType         | readableName
            ${Attribute.ARMOR}    | ${readableName[Attribute.ARMOR]}
            ${Attribute.ABSORB}   | ${readableName[Attribute.ABSORB]}
            ${Attribute.MOVEMENT} | ${readableName[Attribute.MOVEMENT]}
            ${Attribute.HUSTLE}   | ${readableName[Attribute.HUSTLE]}
            ${Attribute.ELUSIVE}  | ${readableName[Attribute.ELUSIVE]}
        `(
            "$attributeType readable name is: $readableName",
            ({ attributeType, readableName }) => {
                expect(
                    AttributeTypeService.readableName(attributeType)
                ).toEqual(readableName)
            }
        )
    })
    it("getAttributeIconResourceKeyForAttributeType", () => {
        expect(
            AttributeTypeService.getAttributeIconResourceKeyForAttributeType(
                Attribute.ARMOR
            )
        ).toEqual("attribute-icon-armor")
    })
})
