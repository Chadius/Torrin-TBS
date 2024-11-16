import { GraphicsBuffer } from "./graphicsRenderer"

export const TextHandlingService = {
    calculateLengthOfLineOfText: ({
        text,
        textSize,
        strokeWeight,
        graphicsContext,
    }: {
        text: string
        textSize: number
        strokeWeight: number
        graphicsContext: GraphicsBuffer
    }): number => {
        graphicsContext.push()
        graphicsContext.textSize(textSize)
        graphicsContext.strokeWeight(strokeWeight)
        const width = graphicsContext.textWidth(text) * 1.2
        graphicsContext.pop()
        return width
    },
    approximateLengthOfLineOfText: ({
        text,
        textSize,
        strokeWeight,
    }: {
        text: string
        textSize: number
        strokeWeight: number
    }): number => {
        const widthRatio = {
            uppercase: 0.8,
            number: 0.8,
            default: 0.62,
        }

        return Array.from(text).reduce((current: number, letter: string) => {
            if (
                letter.toUpperCase() === letter &&
                letter !== letter.toLowerCase()
            ) {
                return current + textSize * widthRatio.uppercase
            }
            if (!isNaN(parseInt(letter))) {
                return current + textSize * widthRatio.number
            }
            return current + textSize * widthRatio.default
        }, 0)
    },
}
