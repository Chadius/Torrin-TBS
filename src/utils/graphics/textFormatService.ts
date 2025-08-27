export const TextFormatService = {
    approximateLengthOfLineOfText: ({
        text,
        fontSize,
        strokeWeight,
    }: {
        text: string
        fontSize: number
        strokeWeight: number
    }): number => {
        const widthRatio = {
            uppercase: 0.8,
            number: 0.8,
            default: 0.62,
        }

        return (
            Array.from(text).reduce((current: number, letter: string) => {
                if (
                    letter.toUpperCase() === letter &&
                    letter !== letter.toLowerCase()
                ) {
                    return current + fontSize * widthRatio.uppercase
                }
                if (!isNaN(parseInt(letter))) {
                    return current + fontSize * widthRatio.number
                }
                return current + fontSize * widthRatio.default
            }, 0) + strokeWeight
        )
    },
    padPlusOnPositiveNumber: (numberToPrint: number): string => {
        let padding: string = numberToPrint > 0 ? "+" : ""
        return `${padding}${numberToPrint}`
    },
    titleCase: (input: string): string =>
        input.charAt(0).toUpperCase() + input.slice(1).toLowerCase(),
}
