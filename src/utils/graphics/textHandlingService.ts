import { StyleFontConstants } from "../../cutscene/dialogue/constants"

export const TextHandlingService = {
    calculateLengthOfLineOfText: ({
        text,
        fontStyle,
    }: {
        text: string
        fontStyle: StyleFontConstants
    }): number =>
        Array.from(text).reduce((current: number, letter: string) => {
            if (
                letter.toUpperCase() === letter &&
                letter !== letter.toLowerCase()
            ) {
                return (
                    current +
                    fontStyle.textSize * fontStyle.widthRatio.uppercase
                )
            }
            if (!isNaN(parseInt(letter))) {
                return (
                    current + fontStyle.textSize * fontStyle.widthRatio.number
                )
            }
            return current + fontStyle.textSize * fontStyle.widthRatio.default
        }, 0),
}
