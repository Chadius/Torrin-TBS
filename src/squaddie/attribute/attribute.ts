import { TextFormatService } from "../../utils/graphics/textFormatService"

export const Attribute = {
    ARMOR: "ARMOR",
    ABSORB: "ABSORB",
    MOVEMENT: "MOVEMENT",
    HUSTLE: "HUSTLE",
    ELUSIVE: "ELUSIVE",
} as const satisfies Record<string, string>

export type TAttribute = EnumLike<typeof Attribute>

const ATTRIBUTE_TYPE_DESCRIPTION: { [t in TAttribute]: string } = {
    [Attribute.ABSORB]: "Temporary HP",
    [Attribute.ARMOR]: "Harder to hit",
    [Attribute.MOVEMENT]: "Travel further per action point",
    [Attribute.ELUSIVE]: "Can pass through enemies",
    [Attribute.HUSTLE]: "Ignore rough terrain movement cost",
}

export type AttributeTypeAndAmount = {
    type: TAttribute
    amount: number
}

export const AttributeTypeService = {
    isBinary: (type: TAttribute): boolean =>
        new Set<TAttribute>([Attribute.HUSTLE, Attribute.ELUSIVE]).has(type),
    readableName: (type: TAttribute): string =>
        `${TextFormatService.titleCase(type.toString()).replaceAll("_", " ")}`,
    getAttributeIconResourceKeyForAttributeType: (a: TAttribute): string =>
        `attribute-icon-${a.toString().toLowerCase().replaceAll("_", "-")}`,
    getAttributeTypeDescription: (type: TAttribute): string =>
        ATTRIBUTE_TYPE_DESCRIPTION[type],
}
