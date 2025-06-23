import { GraphicsBuffer } from "./graphicsRenderer"

export const TEXT_WIDTH_MULTIPLIER = 1.1

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

export type FontDescription = {
    fontSizeRange?: FontSizeRange
    strokeWeight: number
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
    }): number =>
        calculateLengthOfLineOfText({
            text,
            fontSize,
            strokeWeight,
            graphicsContext,
        }),
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
        font,
        graphicsContext,
        linesOfTextRange,
    }: {
        text: string
        maximumWidth: number
        graphicsContext: GraphicsBuffer
        font: FontDescription
        linesOfTextRange?: LinesOfTextRange
    }): TextFit => {
        let defaultFontSize =
            font?.fontSizeRange?.preferred ?? DEFAULT_FONT_SIZE.preferred
        if (!text || text.length <= 0)
            return {
                text,
                width: 0,
                fontSize: defaultFontSize,
            }

        graphicsContext.push()
        let inProgressTextFit: TextFit = {
            text,
            fontSize: defaultFontSize,
            width: Math.max(
                ...text.split("\n").map((text) =>
                    calculateLengthOfLineOfText({
                        text,
                        fontSize: defaultFontSize,
                        strokeWeight: font?.strokeWeight ?? 1,
                        graphicsContext,
                    })
                )
            ),
        }
        graphicsContext.pop()

        let numberOfRetries = 4
        while (numberOfRetries > 0) {
            numberOfRetries -= 1

            const violatedConstraints = {
                tooWide: doesTextFitWithinAllottedWidth({
                    inProgressTextFit,
                    maximumWidth,
                    graphicsContext,
                    font,
                }),
                minimumNumberOfLines:
                    doesTextFitViolateMinimumLinesOfTextConstraint({
                        inProgressTextFit,
                        linesOfTextRange,
                    }),
                fontSize: doesTextFitViolateFontSizeConstraint({
                    inProgressTextFit,
                    fontSizeRange: font?.fontSizeRange,
                }),
            }

            if (!Object.values(violatedConstraints).includes(true)) break

            if (violatedConstraints.tooWide) {
                reduceTextWidthByAddingLineBreaks({
                    inProgressTextFit,
                    linesOfTextRange,
                    maximumPixelWidth: maximumWidth,
                    graphicsContext,
                    font,
                })

                updateTextFitViolateFontSizeConstraint({
                    inProgressTextFit,
                    font,
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

        inProgressTextFit.width = getWidthOfWidestLineOfText({
            inProgressTextFit: inProgressTextFit,
            graphicsContext: graphicsContext,
            font,
        })
        return inProgressTextFit
    },
    padPlusOnPositiveNumber: (numberToPrint: number): string => {
        let padding: string = numberToPrint > 0 ? "+" : ""
        return `${padding}${numberToPrint}`
    },
    titleCase: (input: string): string =>
        input.charAt(0).toUpperCase() + input.slice(1).toLowerCase(),
    calculateMaximumHeightOfFont: ({
        fontSize,
        graphicsContext,
    }: {
        fontSize: number
        graphicsContext: GraphicsBuffer
    }): number => {
        graphicsContext.push()
        graphicsContext.textSize(fontSize)
        const maxHeight =
            graphicsContext.textAscent() +
            graphicsContext.textDescent() +
            fontSize
        graphicsContext.pop()
        return maxHeight
    },
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
    font,
}: {
    inProgressTextFit: TextFit
    maximumWidth: number
    graphicsContext: GraphicsBuffer
    font: FontDescription
}): boolean => {
    graphicsContext.push()
    graphicsContext.textSize(inProgressTextFit.fontSize)
    const widestWidth = getWidthOfWidestLineOfText({
        inProgressTextFit: inProgressTextFit,
        graphicsContext: graphicsContext,
        font,
    })
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

    return inProgressTextFit.width < fontSizeRange.minimum
}

const updateTextFitViolateFontSizeConstraint = ({
    inProgressTextFit,
    maximumPixelWidth,
    graphicsContext,
    font,
}: {
    inProgressTextFit: TextFit
    maximumPixelWidth: number
    graphicsContext: GraphicsBuffer
    font: FontDescription
}) => {
    let currentFontSize = font.fontSizeRange.preferred
    graphicsContext.push()
    let lowerBound = font.fontSizeRange.minimum

    while (currentFontSize > lowerBound) {
        graphicsContext.textSize(currentFontSize)
        const widestWidth = getWidthOfWidestLineOfText({
            inProgressTextFit: inProgressTextFit,
            graphicsContext: graphicsContext,
            font,
        })
        if (widestWidth > maximumPixelWidth) {
            currentFontSize = (currentFontSize + lowerBound) / 2
        } else {
            lowerBound = currentFontSize
        }
    }
    graphicsContext.pop()

    inProgressTextFit.fontSize = currentFontSize
}

const getWidthOfWidestLineOfText = ({
    inProgressTextFit,
    graphicsContext,
    font,
}: {
    inProgressTextFit: TextFit
    graphicsContext: GraphicsBuffer
    font: FontDescription
}): number =>
    Math.max(
        ...getWidthOfEachLineOfText({
            font,
            inProgressTextFit: inProgressTextFit,
            graphicsContext: graphicsContext,
        })
    )

const getWidthOfEachLineOfText = ({
    inProgressTextFit,
    graphicsContext,
    font,
}: {
    inProgressTextFit: TextFit
    graphicsContext: GraphicsBuffer
    font: {
        strokeWeight: number
        fontSizeRange?: FontSizeRange
    }
}): number[] =>
    inProgressTextFit.text.split("\n").map((text) =>
        calculateLengthOfLineOfText({
            text,
            strokeWeight: font.strokeWeight,
            fontSize: inProgressTextFit.fontSize,
            graphicsContext,
        })
    )

const splitTextAgainstLineBreaks = (inProgressTextFit: TextFit): string[] =>
    inProgressTextFit.text.split("\n")

const reduceTextWidthByAddingLineBreaks = ({
    inProgressTextFit,
    linesOfTextRange,
    graphicsContext,
    maximumPixelWidth,
    font,
}: {
    inProgressTextFit: TextFit
    linesOfTextRange: LinesOfTextRange
    maximumPixelWidth: number
    graphicsContext: GraphicsBuffer
    font: FontDescription
}) => {
    let splitText = splitTextAgainstLineBreaks(inProgressTextFit)
    if (splitText.length >= linesOfTextRange?.maximum) return

    let linePixelWidths = getWidthOfEachLineOfText({
        inProgressTextFit: inProgressTextFit,
        graphicsContext: graphicsContext,
        font,
    })

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
        if (pos == -1) continue

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
        (maximumPixelWidth / linePixelWidths[indexOfLongLine]) *
        lineToBreak.length
    const whitespacesReversed = [...whitespaceIndexes].reverse()
    const getMaxWordBreakIndexThatIsLessThan = (maximum: number): number =>
        whitespacesReversed.find((wordBreakIndex) => wordBreakIndex < maximum)

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

    if (whitespaceIndexes.length > 0) return whitespaceIndexes[0]
    return undefined
}

const calculateLengthOfLineOfText = ({
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
    const width = graphicsContext.textWidth(text) * TEXT_WIDTH_MULTIPLIER
    graphicsContext.pop()
    return width
}
