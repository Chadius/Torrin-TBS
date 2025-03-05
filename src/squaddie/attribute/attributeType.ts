import { TextHandlingService } from "../../utils/graphics/textHandlingService"

export enum AttributeType {
    ARMOR = "ARMOR",
    ABSORB = "ABSORB",
    MOVEMENT = "MOVEMENT",
    HUSTLE = "HUSTLE",
    ELUSIVE = "ELUSIVE",
}

const ATTRIBUTE_TYPE_DESCRIPTION: { [t in AttributeType]: string } = {
    [AttributeType.ABSORB]: "Temporary HP",
    [AttributeType.ARMOR]: "Harder to hit",
    [AttributeType.MOVEMENT]: "Travel further per action point",
    [AttributeType.ELUSIVE]: "Can pass through enemies",
    [AttributeType.HUSTLE]: "Ignore rough terrain movement cost",
}

export type AttributeTypeAndAmount = {
    type: AttributeType
    amount: number
}

export const AttributeTypeService = {
    isBinary: (type: AttributeType): boolean =>
        [AttributeType.HUSTLE, AttributeType.ELUSIVE].includes(type),
    readableName: (type: AttributeType): string =>
        `${TextHandlingService.titleCase(type).replaceAll("_", " ")}`,
    getAttributeIconResourceKeyForAttributeType: (a: AttributeType): string =>
        `attribute-icon-${a.toLowerCase().replaceAll("_", "-")}`,
    getAttributeTypeDescription: (type: AttributeType): string =>
        ATTRIBUTE_TYPE_DESCRIPTION[type],
}
