import { describe, expect, it } from "vitest"
import {
    AttributeType,
    AttributeTypeService,
} from "../../squaddie/attribute/attributeType"
import { Glossary, GlossaryTerm } from "./glossary"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../action/template/actionTemplate"
import {
    ActionEffectTemplateService,
    TargetBySquaddieAffiliationRelation,
} from "../../action/template/actionEffectTemplate"
import {
    AttributeModifierService,
    AttributeSource,
} from "../../squaddie/attribute/attributeModifier"

describe("glossary", () => {
    it("will have all attribute types as glossary terms", () => {
        let glossary = new Glossary()
        expect(
            Object.values(AttributeType).every((attributeType) =>
                glossary.hasAttributeTypeTerm(attributeType)
            )
        ).toBe(true)
    })
    it("can get a definition and icon for a given Attribute Type", () => {
        let glossary = new Glossary()
        expect(
            glossary.getGlossaryTermFromAttributeModifier(AttributeType.ARMOR)
        ).toEqual({
            name: "Armor",
            definition: expect.any(String),
            iconResourceKey:
                AttributeTypeService.getAttributeIconResourceKeyForAttributeType(
                    AttributeType.ARMOR
                ),
        })
    })
    it("can add custom terms", () => {
        let glossary = new Glossary()
        glossary.addCustomTerm({
            customTermName: "custom",
            definition: "this is a custom term",
            iconResourceKey: "customIconResourceKey",
        })
        expect(glossary.hasCustomTerm("custom")).toBe(true)
        expect(glossary.getGlossaryTermFromCustom("custom")).toEqual({
            name: "custom",
            definition: "this is a custom term",
            iconResourceKey: "customIconResourceKey",
        })

        glossary.addCustomTerm({
            customTermName: "custom without icon",
            definition: "this is a custom term but it does not have an icon",
        })
        expect(glossary.hasCustomTerm("custom without icon")).toBe(true)
        expect(
            glossary.getGlossaryTermFromCustom("custom without icon")
        ).toEqual({
            name: "custom without icon",
            definition: "this is a custom term but it does not have an icon",
        })

        expect(glossary.hasCustomTerm("does not exist")).toBe(false)
        expect(
            glossary.getGlossaryTermFromCustom("does not exist")
        ).toBeUndefined()
    })
    it("can return glossary terms from an ActionTemplate with AttributeModifiers", () => {
        let elusiveArmorActionTemplate: ActionTemplate =
            ActionTemplateService.new({
                id: "elusiveArmor",
                name: "elusiveArmor",
                userInformation: {
                    userReadableDescription:
                        "less likely to hit and you can move through enemies",
                    customGlossaryTerms: [],
                },
                actionEffectTemplates: [
                    ActionEffectTemplateService.new({
                        squaddieAffiliationRelation: {
                            [TargetBySquaddieAffiliationRelation.TARGET_SELF]:
                                true,
                        },
                        attributeModifiers: [
                            AttributeModifierService.new({
                                type: AttributeType.ARMOR,
                                source: AttributeSource.CIRCUMSTANCE,
                                amount: 1,
                            }),
                            AttributeModifierService.new({
                                type: AttributeType.ELUSIVE,
                                source: AttributeSource.STATUS,
                                amount: 1,
                                duration: 1,
                            }),
                        ],
                    }),
                ],
            })
        let glossary = new Glossary()
        let glossaryTerms: GlossaryTerm[] =
            glossary.getGlossaryTermsFromActionTemplate(
                elusiveArmorActionTemplate
            )
        expect(glossaryTerms).toHaveLength(2)

        expect(
            glossary.getGlossaryTermsFromActionTemplate(
                elusiveArmorActionTemplate
            )
        ).toEqual(
            expect.arrayContaining([
                glossary.getGlossaryTermFromAttributeModifier(
                    AttributeType.ARMOR
                ),
                glossary.getGlossaryTermFromAttributeModifier(
                    AttributeType.ELUSIVE
                ),
            ])
        )
    })
    it("can return glossary terms from an ActionTemplate with custom terms", () => {
        let elusiveArmorActionTemplate: ActionTemplate =
            ActionTemplateService.new({
                id: "movementPlus",
                name: "movementPlus",
                userInformation: {
                    userReadableDescription: "movement increase",
                    customGlossaryTerms: [
                        {
                            name: "0",
                            definition: "definition without icon",
                        },
                        {
                            name: "0",
                            definition: "definition with icon",
                            iconResourceKey: "customIconResourceKey",
                        },
                    ],
                },
                actionEffectTemplates: [
                    ActionEffectTemplateService.new({
                        squaddieAffiliationRelation: {
                            [TargetBySquaddieAffiliationRelation.TARGET_SELF]:
                                true,
                        },
                        attributeModifiers: [
                            AttributeModifierService.new({
                                type: AttributeType.MOVEMENT,
                                source: AttributeSource.CIRCUMSTANCE,
                                amount: 1,
                            }),
                        ],
                    }),
                ],
            })
        let glossary = new Glossary()
        let glossaryTerms: GlossaryTerm[] =
            glossary.getGlossaryTermsFromActionTemplate(
                elusiveArmorActionTemplate
            )
        expect(glossaryTerms).toHaveLength(3)

        expect(
            glossary.getGlossaryTermsFromActionTemplate(
                elusiveArmorActionTemplate
            )
        ).toEqual(
            expect.arrayContaining([
                glossary.getGlossaryTermFromAttributeModifier(
                    AttributeType.MOVEMENT
                ),
                {
                    name: "0",
                    definition: "definition without icon",
                },
                {
                    name: "0",
                    definition: "definition with icon",
                    iconResourceKey: "customIconResourceKey",
                },
            ])
        )
    })
})
