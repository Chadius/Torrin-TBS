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
    maximumWidthOfText: number
    containerWidth: number
}

export type FontDescription = {
    preferredFontSize: number
    strokeWeight: number
}

export type TextFitMitigation =
    | {
          minimumFontSize: number
      }
    | {
          maximumNumberOfLines: number
      }
    | {
          possibleContainerWidths: number[]
      }

const applyMitigationsToSatisfy = ({
    mitigations,
    inProgressTextFit,
    currentContainerWidth,
    graphics,
    fontDescription,
}: {
    mitigations: TextFitMitigation[]
    inProgressTextFit: TextFit
    currentContainerWidth: number
    graphics: GraphicsBuffer
    fontDescription: FontDescription
}): TextFit => {
    for (let i = 0; i < mitigations.length; i++) {
        let mitigation = mitigations[i]
        let doesItFit = doesTextFitWithinAllottedWidth({
            inProgressTextFit,
            maximumWidth: currentContainerWidth,
            graphicsContext: graphics,
            font: fontDescription,
        })
        if (doesItFit) break

        if ("possibleContainerWidths" in mitigation) {
            inProgressTextFit = updateContainerWidthToFitText({
                inProgressTextFit,
                fontDescription,
                possibleWidths: mitigation.possibleContainerWidths,
                graphics,
            })
        }

        if ("minimumFontSize" in mitigation) {
            inProgressTextFit = updateTextFitViolateFontSizeConstraint({
                inProgressTextFit,
                font: fontDescription,
                startingFontSize: fontDescription.preferredFontSize,
                minimumFontSize: mitigation.minimumFontSize,
                maximumPixelWidth: inProgressTextFit.containerWidth,
                graphicsContext: graphics,
            })
        }
        if ("maximumNumberOfLines" in mitigation) {
            let remainingAttempts = mitigation.maximumNumberOfLines
            let numberOfLines =
                splitTextAgainstLineBreaks(inProgressTextFit).length

            while (
                remainingAttempts > 0 &&
                !(doesItFit || numberOfLines >= mitigation.maximumNumberOfLines)
            ) {
                inProgressTextFit = reduceTextWidthByAddingALineBreak({
                    inProgressTextFit,
                    maximumLinesOfText: mitigation.maximumNumberOfLines,
                    maximumPixelWidth: inProgressTextFit.containerWidth,
                    graphicsContext: graphics,
                    font: fontDescription,
                })
                doesItFit = doesTextFitWithinAllottedWidth({
                    inProgressTextFit,
                    maximumWidth: currentContainerWidth,
                    graphicsContext: graphics,
                    font: fontDescription,
                })
                numberOfLines =
                    splitTextAgainstLineBreaks(inProgressTextFit).length
                remainingAttempts -= 1
            }
        }
    }
    return inProgressTextFit
}
export const TextGraphicalHandlingService = {
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
    fitTextWithinSpace: ({
        text,
        currentContainerWidth,
        fontDescription,
        graphics,
        mitigations,
    }: {
        text: string
        currentContainerWidth: number
        graphics: GraphicsBuffer
        fontDescription: FontDescription
        mitigations: TextFitMitigation[]
    }): TextFit => {
        let defaultFontSize =
            fontDescription.preferredFontSize ?? DEFAULT_FONT_SIZE.preferred
        if (!text || text.length <= 0)
            return {
                text,
                maximumWidthOfText: 0,
                containerWidth: 0,
                fontSize: defaultFontSize,
            }

        graphics.push()
        let inProgressTextFit: TextFit = {
            text,
            fontSize: defaultFontSize,
            containerWidth: currentContainerWidth,
            maximumWidthOfText: Math.max(
                ...text.split("\n").map((text) =>
                    calculateLengthOfLineOfText({
                        text,
                        fontSize: defaultFontSize,
                        strokeWeight: fontDescription?.strokeWeight ?? 1,
                        graphicsContext: graphics,
                    })
                )
            ),
        }
        graphics.pop()
        inProgressTextFit = applyMitigationsToSatisfy({
            mitigations: mitigations,
            inProgressTextFit: inProgressTextFit,
            currentContainerWidth: currentContainerWidth,
            graphics: graphics,
            fontDescription: fontDescription,
        })
        inProgressTextFit.maximumWidthOfText = getWidthOfWidestLineOfText({
            inProgressTextFit: inProgressTextFit,
            graphicsContext: graphics,
            font: fontDescription,
            fontSize: inProgressTextFit.fontSize,
        })
        return inProgressTextFit
    },
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
        fontSize: inProgressTextFit.fontSize,
    })
    graphicsContext.pop()
    return widestWidth <= maximumWidth
}

const updateTextFitViolateFontSizeConstraint = ({
    inProgressTextFit,
    maximumPixelWidth,
    graphicsContext,
    font,
    startingFontSize,
    minimumFontSize,
}: {
    inProgressTextFit: TextFit
    maximumPixelWidth: number
    graphicsContext: GraphicsBuffer
    font: FontDescription
    startingFontSize: number
    minimumFontSize: number
}): TextFit => {
    graphicsContext.push()

    let low = minimumFontSize
    let high = startingFontSize
    let bestFontSize = low

    while (high - low > 0.5) {
        const currentFontSize = (low + high) / 2
        graphicsContext.textSize(currentFontSize)

        const widestWidth = getWidthOfWidestLineOfText({
            inProgressTextFit: inProgressTextFit,
            graphicsContext: graphicsContext,
            font,
            fontSize: currentFontSize,
        })

        if (widestWidth <= maximumPixelWidth) {
            bestFontSize = currentFontSize
            low = currentFontSize
        } else {
            high = currentFontSize
        }
    }

    graphicsContext.pop()
    return {
        ...inProgressTextFit,
        fontSize: bestFontSize,
    }
}

const getWidthOfWidestLineOfText = ({
    inProgressTextFit,
    graphicsContext,
    font,
    fontSize,
}: {
    inProgressTextFit: TextFit
    graphicsContext: GraphicsBuffer
    font: FontDescription
    fontSize: number
}): number =>
    Math.max(
        ...getWidthOfEachLineOfText({
            font,
            inProgressTextFit,
            graphicsContext,
            fontSize,
        })
    )

const getWidthOfEachLineOfText = ({
    inProgressTextFit,
    graphicsContext,
    font,
    fontSize,
}: {
    inProgressTextFit: TextFit
    graphicsContext: GraphicsBuffer
    font: FontDescription
    fontSize: number
}): number[] =>
    inProgressTextFit.text.split("\n").map((text) =>
        calculateLengthOfLineOfText({
            text,
            strokeWeight: font.strokeWeight,
            fontSize,
            graphicsContext,
        })
    )

const splitTextAgainstLineBreaks = (inProgressTextFit: TextFit): string[] =>
    inProgressTextFit.text.split("\n")

const reduceTextWidthByAddingALineBreak = ({
    inProgressTextFit,
    graphicsContext,
    maximumPixelWidth,
    font,
}: {
    inProgressTextFit: TextFit
    maximumLinesOfText: number
    maximumPixelWidth: number
    graphicsContext: GraphicsBuffer
    font: FontDescription
}): TextFit => {
    let linePixelWidths = getWidthOfEachLineOfText({
        inProgressTextFit: inProgressTextFit,
        graphicsContext: graphicsContext,
        font,
        fontSize: inProgressTextFit.fontSize,
    })

    let indexOfLongLine = linePixelWidths.findIndex(
        (w) => w > maximumPixelWidth
    )
    if (indexOfLongLine == -1) return inProgressTextFit

    let splitText = splitTextAgainstLineBreaks(inProgressTextFit)
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

    if (indexToInsertNewLine == undefined) return inProgressTextFit
    splitText[indexOfLongLine] =
        lineToBreak.substring(0, indexToInsertNewLine) +
        "\n" +
        lineToBreak.substring(indexToInsertNewLine + 1)
    return {
        ...inProgressTextFit,
        text: splitText.join("\n"),
    }
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
}): number | undefined => {
    let guessIndex =
        (maximumPixelWidth / linePixelWidths[indexOfLongLine]) *
        lineToBreak.length
    const whitespacesReversed = [...whitespaceIndexes].reverse()
    const getMaxWordBreakIndexThatIsLessThan = (
        maximum: number
    ): number | undefined =>
        whitespacesReversed.find((wordBreakIndex) => wordBreakIndex < maximum)

    let wordBreakIndex = getMaxWordBreakIndexThatIsLessThan(guessIndex)
    while (wordBreakIndex != undefined && wordBreakIndex > 0) {
        const isSubStringShorterThanMaximumWidth = (
            endOfSubStringIndex: number
        ): boolean => {
            const subString = lineToBreak.slice(0, endOfSubStringIndex)
            return graphicsContext.textWidth(subString) < maximumPixelWidth
        }
        if (isSubStringShorterThanMaximumWidth(wordBreakIndex)) break
        wordBreakIndex = getMaxWordBreakIndexThatIsLessThan(wordBreakIndex)
    }
    if (wordBreakIndex != undefined && wordBreakIndex > 0) return wordBreakIndex

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

const updateContainerWidthToFitText = ({
    inProgressTextFit,
    possibleWidths,
    graphics,
    fontDescription,
}: {
    inProgressTextFit: TextFit
    fontDescription: FontDescription
    possibleWidths: number[]
    graphics: GraphicsBuffer
}): TextFit => {
    if (possibleWidths.length == 0) return inProgressTextFit

    let widthOfWidestLineOfText = getWidthOfWidestLineOfText({
        inProgressTextFit,
        graphicsContext: graphics,
        font: fontDescription,
        fontSize: fontDescription.preferredFontSize,
    })

    const newContainerWidth =
        possibleWidths
            .toSorted((a, b) => a - b)
            .find(
                (containerWidth) => containerWidth >= widthOfWidestLineOfText
            ) ?? possibleWidths.toSorted().slice(-1)[0]

    return {
        ...inProgressTextFit,
        containerWidth: newContainerWidth,
    }
}
