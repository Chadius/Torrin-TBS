import { GraphicsBuffer } from "./graphicsRenderer"

interface TextFit {
    text: string
    textSize: number
    width: number
}

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
    fitTextWithinSpace: ({
        text,
        width,
        fontSizeRange,
        graphicsContext,
        linesOfTextRange,
    }: {
        text: string
        width: number
        graphicsContext: GraphicsBuffer
        fontSizeRange?: { minimum: number; preferred: number }
        linesOfTextRange?: {
            minimum: number
        }
    }): TextFit => {
        let inProgressTextFit: TextFit = {
            text,
            textSize: fontSizeRange ? fontSizeRange.preferred : 10,
            width: graphicsContext.textWidth(text),
        }

        let numberOfRetries = 4
        while (numberOfRetries > 0) {
            numberOfRetries -= 1

            if (
                doesTextFitViolateMinimumLinesOfTextConstraint({
                    inProgressTextFit,
                    linesOfTextRange,
                })
            ) {
                inProgressTextFit =
                    updateTextFitToSatisfyMinimumLinesOfTextConstraint({
                        inProgressTextFit,
                        linesOfTextRange,
                    })
                continue
            }

            if (
                doesTextFitViolateFontSizeConstraint({
                    inProgressTextFit,
                    width,
                    graphicsContext,
                    fontSizeRange,
                })
            ) {
                inProgressTextFit = updateTextFitViolateFontSizeConstraint({
                    inProgressTextFit,
                    fontSizeRange,
                    width,
                    graphicsContext,
                })
                continue
            }

            break
        }

        inProgressTextFit.width = getWidthOfText(
            inProgressTextFit,
            graphicsContext
        )
        return inProgressTextFit
    },
}

const updateTextFitToSatisfyMinimumLinesOfTextConstraint = ({
    inProgressTextFit,
    linesOfTextRange,
}: {
    inProgressTextFit: TextFit
    linesOfTextRange?: { minimum: number }
}): TextFit => {
    const textPerLine: string[] = inProgressTextFit.text.split("\n")
    let numberOfNewLinesToAdd = linesOfTextRange.minimum - textPerLine.length
    while (numberOfNewLinesToAdd > 0) {
        const indexOfLastLineWithASpace = textPerLine
            .reverse()
            .findIndex((lineOfText) => lineOfText.includes(" "))
        if (indexOfLastLineWithASpace < 0) {
            break
        }

        textPerLine[indexOfLastLineWithASpace] = textPerLine[
            indexOfLastLineWithASpace
        ].replace(/ ([^ ]*)$/, "\n" + "$1")
        numberOfNewLinesToAdd -= 1
    }
    inProgressTextFit.text = textPerLine.join(" ")

    return inProgressTextFit
}

const doesTextFitViolateMinimumLinesOfTextConstraint = ({
    inProgressTextFit,
    linesOfTextRange,
}: {
    inProgressTextFit: TextFit
    linesOfTextRange?: { minimum: number }
}): boolean => {
    if (
        linesOfTextRange?.minimum == undefined ||
        inProgressTextFit.text.length <= 0
    ) {
        return false
    }

    const textPerLine: string[] = inProgressTextFit.text.split("\n")
    return textPerLine.length < linesOfTextRange.minimum
}

const doesTextFitViolateFontSizeConstraint = ({
    inProgressTextFit,
    width,
    graphicsContext,
    fontSizeRange,
}: {
    inProgressTextFit: TextFit
    width: number
    graphicsContext: GraphicsBuffer
    fontSizeRange?: { minimum: number; preferred: number }
}): boolean => {
    if (
        fontSizeRange?.minimum == undefined ||
        inProgressTextFit.text.length <= 0
    ) {
        return false
    }

    graphicsContext.push()
    graphicsContext.textSize(inProgressTextFit.textSize)
    const widestWidth = getWidthOfText(inProgressTextFit, graphicsContext)
    graphicsContext.pop()
    return widestWidth > width
}

const updateTextFitViolateFontSizeConstraint = ({
    inProgressTextFit,
    fontSizeRange,
    width,
    graphicsContext,
}: {
    inProgressTextFit: TextFit
    fontSizeRange: { minimum: number; preferred: number }
    width: number
    graphicsContext: GraphicsBuffer
}): TextFit => {
    let currentTextSize = fontSizeRange.preferred
    graphicsContext.push()
    while (currentTextSize > fontSizeRange.minimum) {
        graphicsContext.textSize(currentTextSize)
        const widestWidth = getWidthOfText(inProgressTextFit, graphicsContext)
        if (widestWidth <= width) {
            break
        }
        currentTextSize = (currentTextSize + fontSizeRange.minimum) / 2
    }
    graphicsContext.pop()

    inProgressTextFit.textSize = currentTextSize
    return inProgressTextFit
}

const getWidthOfText = (
    inProgressTextFit: TextFit,
    graphicsContext: GraphicsBuffer
) => {
    return Math.max(
        ...inProgressTextFit.text.split("\n").map(graphicsContext.textWidth)
    )
}
