import { describe, expect, it, test } from "vitest"
import { AttributeType, AttributeTypeService } from "./attributeType"

describe("Attribute Type", () => {
    describe("knows when the attribute is binary", () => {
        const binaryStatus: { [t in AttributeType]: boolean } = {
            [AttributeType.ARMOR]: false,
            [AttributeType.ABSORB]: false,
            [AttributeType.MOVEMENT]: false,
            [AttributeType.HUSTLE]: true,
            [AttributeType.ELUSIVE]: true,
        }

        test.each`
            attributeType             | isBinary
            ${AttributeType.ARMOR}    | ${binaryStatus[AttributeType.ARMOR]}
            ${AttributeType.ABSORB}   | ${binaryStatus[AttributeType.ABSORB]}
            ${AttributeType.MOVEMENT} | ${binaryStatus[AttributeType.MOVEMENT]}
            ${AttributeType.HUSTLE}   | ${binaryStatus[AttributeType.HUSTLE]}
            ${AttributeType.ELUSIVE}  | ${binaryStatus[AttributeType.ELUSIVE]}
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
        const readableName: { [t in AttributeType]: string } = {
            [AttributeType.ARMOR]: "Armor",
            [AttributeType.ABSORB]: "Absorb",
            [AttributeType.MOVEMENT]: "Movement",
            [AttributeType.HUSTLE]: "Hustle",
            [AttributeType.ELUSIVE]: "Elusive",
        }

        test.each`
            attributeType             | readableName
            ${AttributeType.ARMOR}    | ${readableName[AttributeType.ARMOR]}
            ${AttributeType.ABSORB}   | ${readableName[AttributeType.ABSORB]}
            ${AttributeType.MOVEMENT} | ${readableName[AttributeType.MOVEMENT]}
            ${AttributeType.HUSTLE}   | ${readableName[AttributeType.HUSTLE]}
            ${AttributeType.ELUSIVE}  | ${readableName[AttributeType.ELUSIVE]}
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
                AttributeType.ARMOR
            )
        ).toEqual("attribute-icon-armor")
    })
})
