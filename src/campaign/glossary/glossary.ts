import {
    Attribute,
    TAttribute,
    AttributeTypeService,
} from "../../squaddie/attribute/attribute"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../action/template/actionTemplate"
import {
    AttributeModifier,
    AttributeModifierService,
} from "../../squaddie/attribute/attributeModifier"
import {
    InBattleAttributes,
    InBattleAttributesService,
} from "../../battle/stats/inBattleAttributes"

export interface GlossaryTerm {
    name: string
    definition: string
    iconResourceKey?: string
}

export class Glossary {
    attributeType: { [a in TAttribute]: GlossaryTerm }
    customTerms: { [term: string]: GlossaryTerm }

    constructor() {
        this.attributeType = {
            [Attribute.HUSTLE]: {
                name: "Hustle",
                definition: "Ignore terrain penalties",
                iconResourceKey:
                    AttributeTypeService.getAttributeIconResourceKeyForAttributeType(
                        Attribute.HUSTLE
                    ),
            },
            [Attribute.ELUSIVE]: {
                name: "Elusive",
                definition: "Pass through enemy and unaffiliated squaddies",
                iconResourceKey:
                    AttributeTypeService.getAttributeIconResourceKeyForAttributeType(
                        Attribute.ELUSIVE
                    ),
            },
            [Attribute.ARMOR]: {
                name: "Armor",
                definition: "Reduce the chance to get hit (and crit)",
                iconResourceKey:
                    AttributeTypeService.getAttributeIconResourceKeyForAttributeType(
                        Attribute.ARMOR
                    ),
            },
            [Attribute.ABSORB]: {
                name: "Absorb",
                definition: "Temporary HP is lost first",
                iconResourceKey:
                    AttributeTypeService.getAttributeIconResourceKeyForAttributeType(
                        Attribute.ABSORB
                    ),
            },
            [Attribute.MOVEMENT]: {
                name: "Movement",
                definition: "More movement per Action Point",
                iconResourceKey:
                    AttributeTypeService.getAttributeIconResourceKeyForAttributeType(
                        Attribute.MOVEMENT
                    ),
            },
        }
        this.customTerms = {}
    }

    hasAttributeTypeTerm(attributeType: TAttribute): boolean {
        return !!this.attributeType[attributeType]
    }

    addCustomTerm({
        customTermName,
        definition,
        iconResourceKey,
    }: {
        customTermName: string
        definition: string
        iconResourceKey?: string
    }) {
        this.customTerms[customTermName] = {
            name: customTermName,
            definition,
            iconResourceKey,
        }
    }

    hasCustomTerm(customTermName: string): boolean {
        return !!this.customTerms[customTermName]
    }

    getGlossaryTermFromCustom(customTermName: string): GlossaryTerm {
        return this.customTerms[customTermName]
    }

    getGlossaryTermsFromActionTemplate(
        actionTemplate: ActionTemplate
    ): GlossaryTerm[] {
        const modifiers =
            ActionTemplateService.getAttributeModifiers(actionTemplate)
        return [
            ...modifiers.map((modifier) =>
                getGlossaryTermFromAttributeModifier(this, modifier)
            ),
            ...actionTemplate.userInformation.customGlossaryTerms,
        ]
    }
    getGlossaryTermFromAttributeModifier(
        attributeModifier: AttributeModifier
    ): GlossaryTerm {
        return getGlossaryTermFromAttributeModifier(this, attributeModifier)
    }

    getGlossaryTermsFromInBattleAttributes(
        inBattleAttributes: InBattleAttributes
    ): GlossaryTerm[] {
        const modifiers =
            InBattleAttributesService.getAllActiveAttributeModifiers(
                inBattleAttributes
            )
        return [
            ...modifiers.map((modifier) =>
                getGlossaryTermFromAttributeModifier(this, modifier)
            ),
        ]
    }
}

const getGlossaryTermFromAttributeModifier = (
    glossary: Glossary,
    attributeModifier: AttributeModifier
): GlossaryTerm => {
    const baseGlossaryTerm = glossary.attributeType[attributeModifier.type]

    const limits: string[] = []
    if (
        attributeModifier.numberOfUses !== undefined &&
        attributeModifier.numberOfUses > 0
    ) {
        limits.push(
            `${attributeModifier.numberOfUses} ${attributeModifier.numberOfUses == 1 ? "use" : "uses"}`
        )
    }
    if (
        attributeModifier.duration !== undefined &&
        attributeModifier.duration > 1
    ) {
        limits.push(`${attributeModifier.duration} rounds`)
    }

    const limitsString = [
        `${AttributeModifierService.getReadableAttributeSource(attributeModifier.source)}`,
        ...limits,
    ].join(", ")

    return {
        ...baseGlossaryTerm,
        name: `${AttributeModifierService.readableTypeAndAmount(attributeModifier)}`,
        definition: `(${limitsString}) ${baseGlossaryTerm.definition}`,
    }
}
