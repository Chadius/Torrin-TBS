import { GraphicsBuffer } from "./graphicsRenderer"

interface TextFit {
    text: string
    fontSize: number
    width: number
}

export const TextHandlingService = {
    calculateLengthOfLineOfText: ({
        text,
        fontSize,
        strokeWeight,
        graphicsContext,
    }: {
        text: string
        fontSize: number
        strokeWeight: number
        graphicsContext: GraphicsBuffer
    }): number => {
        graphicsContext.push()
        graphicsContext.textSize(fontSize)
        graphicsContext.strokeWeight(strokeWeight)
        const width = graphicsContext.textWidth(text) * 1.2
        graphicsContext.pop()
        return width
    },
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

        return Array.from(text).reduce((current: number, letter: string) => {
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
            fontSize: fontSizeRange ? fontSizeRange.preferred : 10,
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
    padPlusOnPositiveNumber: (numberToPrint: number): string => {
        let padding: string = numberToPrint > 0 ? "+" : ""
        return `${padding}${numberToPrint}`
    },
    titleCase: (input: string): string =>
        input.charAt(0).toUpperCase() + input.slice(1).toLowerCase(),
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
    graphicsContext.textSize(inProgressTextFit.fontSize)
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
    let currentFontSize = fontSizeRange.preferred
    graphicsContext.push()
    while (currentFontSize > fontSizeRange.minimum) {
        graphicsContext.textSize(currentFontSize)
        const widestWidth = getWidthOfText(inProgressTextFit, graphicsContext)
        if (widestWidth <= width) {
            break
        }
        currentFontSize = (currentFontSize + fontSizeRange.minimum) / 2
    }
    graphicsContext.pop()

    inProgressTextFit.fontSize = currentFontSize
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
