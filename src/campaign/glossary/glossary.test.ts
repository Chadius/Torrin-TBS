import { beforeEach, describe, expect, it } from "vitest"
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
import {
    InBattleAttributes,
    InBattleAttributesService,
} from "../../battle/stats/inBattleAttributes"
import {
    ArmyAttributesService,
    DefaultArmyAttributes,
} from "../../squaddie/armyAttributes"

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
        const armorModifier = AttributeModifierService.new({
            type: AttributeType.ARMOR,
            source: AttributeSource.CIRCUMSTANCE,
            amount: 1,
            duration: 2,
            numberOfUses: 3,
        })
        const glossaryTerm =
            glossary.getGlossaryTermFromAttributeModifier(armorModifier)
        expect(glossaryTerm.iconResourceKey).toEqual(
            AttributeTypeService.getAttributeIconResourceKeyForAttributeType(
                AttributeType.ARMOR
            )
        )
        expect(glossaryTerm.name).toEqual("Armor +1")
        expect(
            glossaryTerm.definition.includes("(Circumstance, 3 uses, 2 rounds)")
        ).toBeTruthy()
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
                    AttributeModifierService.new({
                        type: AttributeType.ARMOR,
                        source: AttributeSource.CIRCUMSTANCE,
                        amount: 1,
                    })
                ),
                glossary.getGlossaryTermFromAttributeModifier(
                    AttributeModifierService.new({
                        type: AttributeType.ELUSIVE,
                        source: AttributeSource.STATUS,
                        amount: 1,
                        duration: 1,
                    })
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
                    AttributeModifierService.new({
                        type: AttributeType.MOVEMENT,
                        source: AttributeSource.CIRCUMSTANCE,
                        amount: 1,
                    })
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

    describe("getGlossaryTermsFromInBattleAttributes", () => {
        let glossary: Glossary
        let baseInBattleAttributes: InBattleAttributes

        beforeEach(() => {
            glossary = new Glossary()
            baseInBattleAttributes = InBattleAttributesService.new({
                armyAttributes: ArmyAttributesService.new({
                    ...DefaultArmyAttributes,
                    maxHitPoints: 5,
                }),
                currentHitPoints: 5,
            })
        })

        it("returns empty array when no attribute modifiers are present", () => {
            const glossaryTerms =
                glossary.getGlossaryTermsFromInBattleAttributes(
                    baseInBattleAttributes
                )
            expect(glossaryTerms).toEqual([])
        })

        it("returns glossary terms for multiple active attribute modifiers", () => {
            const armorModifier = AttributeModifierService.new({
                type: AttributeType.ARMOR,
                source: AttributeSource.CIRCUMSTANCE,
                amount: 2,
                duration: 3,
            })

            const movementModifier = AttributeModifierService.new({
                type: AttributeType.MOVEMENT,
                source: AttributeSource.ITEM,
                amount: 1,
                numberOfUses: 2,
            })

            const inBattleAttributes = InBattleAttributesService.new({
                armyAttributes: baseInBattleAttributes.armyAttributes,
                currentHitPoints: 5,
                attributeModifiers: [armorModifier, movementModifier],
            })

            const glossaryTerms =
                glossary.getGlossaryTermsFromInBattleAttributes(
                    inBattleAttributes
                )
            expect(glossaryTerms).toHaveLength(2)
            expect(glossaryTerms).toEqual(
                expect.arrayContaining([
                    glossary.getGlossaryTermFromAttributeModifier(
                        armorModifier
                    ),
                    glossary.getGlossaryTermFromAttributeModifier(
                        movementModifier
                    ),
                ])
            )
        })

        it("returns glossary terms for binary attribute modifiers", () => {
            const hustleModifier = AttributeModifierService.new({
                type: AttributeType.HUSTLE,
                source: AttributeSource.STATUS,
                amount: 1,
                duration: 2,
            })

            const elusiveModifier = AttributeModifierService.new({
                type: AttributeType.ELUSIVE,
                source: AttributeSource.CIRCUMSTANCE,
                amount: 1,
                numberOfUses: 1,
            })

            const inBattleAttributes = InBattleAttributesService.new({
                armyAttributes: baseInBattleAttributes.armyAttributes,
                currentHitPoints: 5,
                attributeModifiers: [hustleModifier, elusiveModifier],
            })

            const glossaryTerms =
                glossary.getGlossaryTermsFromInBattleAttributes(
                    inBattleAttributes
                )
            expect(glossaryTerms).toHaveLength(2)
            expect(glossaryTerms).toEqual(
                expect.arrayContaining([
                    glossary.getGlossaryTermFromAttributeModifier(
                        hustleModifier
                    ),
                    glossary.getGlossaryTermFromAttributeModifier(
                        elusiveModifier
                    ),
                ])
            )
        })

        it("filters out inactive modifiers and returns only active ones", () => {
            const activeModifier = AttributeModifierService.new({
                type: AttributeType.ARMOR,
                source: AttributeSource.CIRCUMSTANCE,
                amount: 2,
                duration: 3,
            })

            const expiredModifier = AttributeModifierService.new({
                type: AttributeType.MOVEMENT,
                source: AttributeSource.ITEM,
                amount: 1,
                duration: 0,
            })

            const usedUpModifier = AttributeModifierService.new({
                type: AttributeType.ABSORB,
                source: AttributeSource.STATUS,
                amount: 5,
                numberOfUses: 0,
            })

            const inBattleAttributes = InBattleAttributesService.new({
                armyAttributes: baseInBattleAttributes.armyAttributes,
                currentHitPoints: 100,
                attributeModifiers: [
                    activeModifier,
                    expiredModifier,
                    usedUpModifier,
                ],
            })

            const glossaryTerms =
                glossary.getGlossaryTermsFromInBattleAttributes(
                    inBattleAttributes
                )
            expect(glossaryTerms).toHaveLength(1)
            expect(glossaryTerms[0]).toEqual(
                glossary.getGlossaryTermFromAttributeModifier(activeModifier)
            )
        })
    })
})
