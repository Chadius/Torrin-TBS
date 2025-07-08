import {
    AttributeType,
    AttributeTypeService,
} from "../../squaddie/attribute/attributeType"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../action/template/actionTemplate"
import {
    AttributeModifier,
    AttributeModifierService,
} from "../../squaddie/attribute/attributeModifier"

export interface GlossaryTerm {
    name: string
    definition: string
    iconResourceKey?: string
}

export class Glossary {
    attributeType: { [a in AttributeType]: GlossaryTerm }
    customTerms: { [term: string]: GlossaryTerm }

    constructor() {
        this.attributeType = {
            [AttributeType.HUSTLE]: {
                name: "Hustle",
                definition: "Ignore terrain penalties",
                iconResourceKey:
                    AttributeTypeService.getAttributeIconResourceKeyForAttributeType(
                        AttributeType.HUSTLE
                    ),
            },
            [AttributeType.ELUSIVE]: {
                name: "Elusive",
                definition: "Pass through enemy and unaffiliated squaddies",
                iconResourceKey:
                    AttributeTypeService.getAttributeIconResourceKeyForAttributeType(
                        AttributeType.ELUSIVE
                    ),
            },
            [AttributeType.ARMOR]: {
                name: "Armor",
                definition: "Reduce the chance to get hit (and crit)",
                iconResourceKey:
                    AttributeTypeService.getAttributeIconResourceKeyForAttributeType(
                        AttributeType.ARMOR
                    ),
            },
            [AttributeType.ABSORB]: {
                name: "Absorb",
                definition: "Temporary HP is lost first",
                iconResourceKey:
                    AttributeTypeService.getAttributeIconResourceKeyForAttributeType(
                        AttributeType.ABSORB
                    ),
            },
            [AttributeType.MOVEMENT]: {
                name: "Movement",
                definition: "More movement per Action Point",
                iconResourceKey:
                    AttributeTypeService.getAttributeIconResourceKeyForAttributeType(
                        AttributeType.MOVEMENT
                    ),
            },
        }
        this.customTerms = {}
    }

    hasAttributeTypeTerm(attributeType: AttributeType): boolean {
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
}

const getGlossaryTermFromAttributeModifier = (
    glossary: Glossary,
    attributeModifier: AttributeModifier
): GlossaryTerm => {
    const baseGlossaryTerm = glossary.attributeType[attributeModifier.type]

    return {
        ...baseGlossaryTerm,
        name: `${AttributeModifierService.readableTypeAndAmount(attributeModifier)}`,
        definition: `(${AttributeModifierService.getReadableAttributeSource(attributeModifier.source)}) ${baseGlossaryTerm.definition}`,
    }
}
