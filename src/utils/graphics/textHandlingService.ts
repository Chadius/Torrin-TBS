import { GraphicsBuffer } from "./graphicsRenderer"

const DEFAULT_FONT_SIZE = {
    minimum: 6,
    preferred: 10,
    maximum: 72,
}

export type FontSizeRange = { minimum: number; preferred: number }
export type LinesOfTextRange = {
    minimum?: number
    maximum?: number
}

export interface TextFit {
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
    fitTextWithinSpace: ({
        text,
        maximumWidth,
        fontSizeRange,
        graphicsContext,
        linesOfTextRange,
    }: {
        text: string
        maximumWidth: number
        graphicsContext: GraphicsBuffer
        fontSizeRange?: FontSizeRange
        linesOfTextRange?: LinesOfTextRange
    }): TextFit => {
        if (!text || text.length <= 0)
            return {
                text,
                width: 0,
                fontSize:
                    fontSizeRange?.preferred ?? DEFAULT_FONT_SIZE.preferred,
            }

        let inProgressTextFit: TextFit = {
            text,
            fontSize: fontSizeRange
                ? fontSizeRange.preferred
                : DEFAULT_FONT_SIZE.preferred,
            width: graphicsContext.textWidth(text),
        }

        let numberOfRetries = 4
        while (numberOfRetries > 0) {
            numberOfRetries -= 1

            const violatedConstraints = {
                tooWide: doesTextFitWithinAllottedWidth({
                    inProgressTextFit,
                    maximumWidth,
                    graphicsContext,
                }),
                minimumNumberOfLines:
                    doesTextFitViolateMinimumLinesOfTextConstraint({
                        inProgressTextFit,
                        linesOfTextRange,
                    }),
                fontSize: doesTextFitViolateFontSizeConstraint({
                    inProgressTextFit,
                    fontSizeRange,
                }),
            }

            if (!Object.values(violatedConstraints).includes(true)) break

            if (violatedConstraints.tooWide) {
                reduceTextWidthByAddingLineBreaks({
                    inProgressTextFit,
                    linesOfTextRange,
                    maximumPixelWidth: maximumWidth,
                    graphicsContext,
                })

                updateTextFitViolateFontSizeConstraint({
                    inProgressTextFit,
                    fontSizeRange,
                    maximumPixelWidth: maximumWidth,
                    graphicsContext,
                })
            }

            if (violatedConstraints.minimumNumberOfLines) {
                updateTextFitToSatisfyMinimumLinesOfTextConstraint({
                    inProgressTextFit,
                    linesOfTextRange,
                })
            }
        }

        inProgressTextFit.width = getWidthOfWidestLineOfText(
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
    linesOfTextRange?: LinesOfTextRange
}) => {
    const textPerLine: string[] = splitTextAgainstLineBreaks(inProgressTextFit)
    if (
        linesOfTextRange?.minimum == undefined ||
        textPerLine.length > linesOfTextRange?.minimum
    )
        return

    let numberOfNewLinesToAdd =
        (linesOfTextRange.minimum ?? 1) - textPerLine.length
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
}

const doesTextFitViolateMinimumLinesOfTextConstraint = ({
    inProgressTextFit,
    linesOfTextRange,
}: {
    inProgressTextFit: TextFit
    linesOfTextRange?: LinesOfTextRange
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

const doesTextFitWithinAllottedWidth = ({
    inProgressTextFit,
    maximumWidth,
    graphicsContext,
}: {
    inProgressTextFit: TextFit
    maximumWidth: number
    graphicsContext: GraphicsBuffer
}): boolean => {
    graphicsContext.push()
    graphicsContext.textSize(inProgressTextFit.fontSize)
    const widestWidth = getWidthOfWidestLineOfText(
        inProgressTextFit,
        graphicsContext
    )
    graphicsContext.pop()
    return widestWidth > maximumWidth
}

const doesTextFitViolateFontSizeConstraint = ({
    inProgressTextFit,
    fontSizeRange,
}: {
    inProgressTextFit: TextFit
    fontSizeRange?: FontSizeRange
}): boolean => {
    if (
        fontSizeRange?.minimum == undefined ||
        inProgressTextFit.text.length <= 0
    ) {
        return false
    }

    return inProgressTextFit.width >= fontSizeRange.minimum
}

const updateTextFitViolateFontSizeConstraint = ({
    inProgressTextFit,
    fontSizeRange,
    maximumPixelWidth,
    graphicsContext,
}: {
    inProgressTextFit: TextFit
    fontSizeRange: FontSizeRange
    maximumPixelWidth: number
    graphicsContext: GraphicsBuffer
}) => {
    let currentFontSize = fontSizeRange.preferred
    graphicsContext.push()
    let lowerBound = fontSizeRange.minimum

    while (currentFontSize > lowerBound) {
        graphicsContext.textSize(currentFontSize)
        const widestWidth = getWidthOfWidestLineOfText(
            inProgressTextFit,
            graphicsContext
        )
        if (widestWidth > maximumPixelWidth) {
            currentFontSize = (currentFontSize + lowerBound) / 2
        } else {
            lowerBound = currentFontSize
        }
    }
    graphicsContext.pop()

    inProgressTextFit.fontSize = currentFontSize
}

const getWidthOfWidestLineOfText = (
    inProgressTextFit: TextFit,
    graphicsContext: GraphicsBuffer
): number =>
    Math.max(...getWidthOfEachLineOfText(inProgressTextFit, graphicsContext))

const getWidthOfEachLineOfText = (
    inProgressTextFit: TextFit,
    graphicsContext: GraphicsBuffer
): number[] =>
    inProgressTextFit.text
        .split("\n")
        .map((text) => graphicsContext.textWidth(text))

const splitTextAgainstLineBreaks = (inProgressTextFit: TextFit): string[] =>
    inProgressTextFit.text.split("\n")

const reduceTextWidthByAddingLineBreaks = ({
    inProgressTextFit,
    linesOfTextRange,
    graphicsContext,
    maximumPixelWidth,
}: {
    inProgressTextFit: TextFit
    linesOfTextRange: LinesOfTextRange
    maximumPixelWidth: number
    graphicsContext: GraphicsBuffer
}) => {
    let splitText = splitTextAgainstLineBreaks(inProgressTextFit)
    if (splitText.length >= linesOfTextRange?.maximum) return

    let linePixelWidths = getWidthOfEachLineOfText(
        inProgressTextFit,
        graphicsContext
    )

    let indexOfLongLine = linePixelWidths.findIndex(
        (w) => w > maximumPixelWidth
    )
    if (indexOfLongLine == -1) return

    let lineToBreak = splitText[indexOfLongLine]
    let whitespaceIndexes = getWhitespaceIndexesOfLine(lineToBreak)

    let indexToInsertNewLine = findIndexToBreakLineWithANewLine({
        lineToBreak,
        linePixelWidths,
        indexOfLongLine,
        maximumPixelWidth,
        whitespaceIndexes,
        graphicsContext,
    })

    if (indexToInsertNewLine == undefined) return

    splitText[indexOfLongLine] =
        lineToBreak.substring(0, indexToInsertNewLine) +
        "\n" +
        lineToBreak.substring(indexToInsertNewLine + 1)
    inProgressTextFit.text = splitText.join("\n")
}

const getWhitespaceIndexesOfLine = (lineToBreak: string) => {
    let whitespaceIndexes: number[] = []
    let pos = 0
    let i = -1
    while (pos != -1) {
        pos = lineToBreak.indexOf(" ", i + 1)
        i = pos
        whitespaceIndexes.push(i)
    }
    return whitespaceIndexes
}

const findIndexToBreakLineWithANewLine = ({
    lineToBreak,
    linePixelWidths,
    indexOfLongLine,
    maximumPixelWidth,
    whitespaceIndexes,
    graphicsContext,
}: {
    lineToBreak: string
    linePixelWidths: number[]
    indexOfLongLine: number
    maximumPixelWidth: number
    whitespaceIndexes: number[]
    graphicsContext: GraphicsBuffer
}): number => {
    let guessIndex =
        (lineToBreak.length * linePixelWidths[indexOfLongLine]) /
        maximumPixelWidth
    const getMaxWordBreakIndexThatIsLessThan = (maximum: number): number =>
        whitespaceIndexes
            .reverse()
            .find((wordBreakIndex) => wordBreakIndex < maximum)

    let wordBreakIndex = getMaxWordBreakIndexThatIsLessThan(guessIndex)

    while (wordBreakIndex > 0) {
        const isSubStringShorterThanMaximumWidth = (
            endOfSubStringIndex: number
        ): boolean => {
            const subString = lineToBreak.slice(0, endOfSubStringIndex)
            return graphicsContext.textWidth(subString) < maximumPixelWidth
        }
        if (isSubStringShorterThanMaximumWidth(wordBreakIndex)) break
        wordBreakIndex = getMaxWordBreakIndexThatIsLessThan(wordBreakIndex)
    }
    if (wordBreakIndex > 0) return wordBreakIndex

    if (whitespaceIndexes.length > 1) return whitespaceIndexes[1]
    return undefined
}
