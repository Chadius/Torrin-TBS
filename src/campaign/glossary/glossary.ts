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
