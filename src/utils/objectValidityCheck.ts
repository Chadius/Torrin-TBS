const notFound = [NaN, false, undefined, null]

export const isValidValue = (value: any): boolean => {
    return !notFound.includes(value)
}

export const getValidValueOrDefault = <T>(value: T, defaultValue: T): T => {
    return (isValidValue(value) ? value : defaultValue) ?? defaultValue
}
