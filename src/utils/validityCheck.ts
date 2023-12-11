const notFound = [NaN, false, undefined, null];

export const isValidValue = (value: any): boolean => {
    return !notFound.includes(value);
}
