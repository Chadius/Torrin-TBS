export enum AttributeType {
    ARMOR = "ARMOR",
    ABSORB = "ABSORB",
    MOVEMENT = "MOVEMENT",
    HUSTLE = "HUSTLE",
    ELUSIVE = "ELUSIVE",
}

export type AttributeTypeAndAmount = {
    type: AttributeType
    amount: number
}

export const AttributeTypeService = {
    isBinary: (type: AttributeType): boolean =>
        [AttributeType.HUSTLE, AttributeType.ELUSIVE].includes(type),
    readableName: (type: AttributeType): string => {
        const capitalizeFirstLetter = (input: string) =>
            type.charAt(0).toUpperCase() + input.slice(1).toLowerCase()
        return `${capitalizeFirstLetter(type).replaceAll("_", " ")}`
    },
    getAttributeIconResourceKeyForAttributeType: (a: AttributeType): string =>
        `attribute-icon-${a.toLowerCase().replaceAll("_", "-")}`,
}
