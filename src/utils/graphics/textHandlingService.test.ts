import {
    TEXT_WIDTH_MULTIPLIER,
    TextFit,
    TextHandlingService,
} from "./textHandlingService"
import { MockedP5GraphicsBuffer } from "../test/mocks"
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    test,
    vi,
} from "vitest"

describe("Text Handling Service", () => {
    let mockGraphicsContext: MockedP5GraphicsBuffer

    beforeEach(() => {
        mockGraphicsContext = new MockedP5GraphicsBuffer()
    })

    it("asks the graphics buffer for the text width", () => {
        let pushSpy = vi.spyOn(mockGraphicsContext, "push")
        let popSpy = vi.spyOn(mockGraphicsContext, "pop")
        let textSizeSpy = vi.spyOn(mockGraphicsContext, "textSize")
        let strokeWeightSpy = vi.spyOn(mockGraphicsContext, "strokeWeight")
        let textWidthSpy = vi
            .spyOn(mockGraphicsContext, "textWidth")
            .mockReturnValue(9001)

        expect(
            TextHandlingService.calculateLengthOfLineOfText({
                text: "Wow! 3 Apples!",
                fontSize: 10,
                strokeWeight: 3,
                graphicsContext: mockGraphicsContext,
            })
        ).toBeCloseTo(9001 * TEXT_WIDTH_MULTIPLIER)

        expect(textWidthSpy).toBeCalledWith("Wow! 3 Apples!")
        expect(textSizeSpy).toBeCalledWith(10)
        expect(strokeWeightSpy).toBeCalledWith(3)

        expect(pushSpy).toBeCalled()
        expect(popSpy).toBeCalled()

        pushSpy.mockRestore()
        popSpy.mockRestore()
        textSizeSpy.mockRestore()
        strokeWeightSpy.mockRestore()
        textWidthSpy.mockRestore()
    })
    it("asks the graphics buffer for the maximum text height", () => {
        let pushSpy = vi.spyOn(mockGraphicsContext, "push")
        let popSpy = vi.spyOn(mockGraphicsContext, "pop")
        let textSizeSpy = vi.spyOn(mockGraphicsContext, "textSize")
        let textAscentSpy = vi
            .spyOn(mockGraphicsContext, "textAscent")
            .mockReturnValue(2)
        let textDescentSpy = vi
            .spyOn(mockGraphicsContext, "textDescent")
            .mockReturnValue(3)

        expect(
            TextHandlingService.calculateMaximumHeightOfFont({
                fontSize: 10,
                graphicsContext: mockGraphicsContext,
            })
        ).toBeCloseTo(2 + 3 + 10)

        expect(textSizeSpy).toBeCalledWith(10)
        expect(textDescentSpy).toBeCalledWith()
        expect(textAscentSpy).toBeCalledWith()

        expect(pushSpy).toBeCalled()
        expect(popSpy).toBeCalled()

        pushSpy.mockRestore()
        popSpy.mockRestore()
        textSizeSpy.mockRestore()
        textAscentSpy.mockRestore()
        textDescentSpy.mockRestore()
    })
    test.each`
        inputString     | approximateLength
        ${"ABCDEFG"}    | ${0.8 * 10 * 7 + 1}
        ${"01234"}      | ${0.8 * 10 * 5 + 1}
        ${"a sly fox."} | ${0.62 * 10 * 10 + 1}
    `(
        "$inputString estimated length is close to: $approximateLength",
        ({ inputString, approximateLength }) => {
            expect(
                TextHandlingService.approximateLengthOfLineOfText({
                    text: inputString,
                    fontSize: 10,
                    strokeWeight: 1,
                })
            ).toBeCloseTo(approximateLength)
        }
    )
    describe("change font to ensure it fits size", () => {
        let textWidthSpy: MockInstance
        let textSizeSpy: MockInstance

        afterEach(() => {
            if (textWidthSpy) textWidthSpy.mockRestore()
            if (textSizeSpy) textSizeSpy.mockRestore()
        })

        it("Returns default font size if text fits on one line", () => {
            textWidthSpy = vi
                .spyOn(mockGraphicsContext, "textWidth")
                .mockReturnValue(24)
            expect(
                expectTextFitToBeCloseTo(
                    TextHandlingService.fitTextWithinSpace({
                        text: "Hi",
                        maximumWidth: 9001,
                        font: {
                            fontSizeRange: {
                                preferred: 12,
                                minimum: 8,
                            },
                            strokeWeight: 1,
                        },
                        linesOfTextRange: {
                            minimum: 1,
                        },
                        graphicsContext: mockGraphicsContext,
                    }),
                    {
                        text: "Hi",
                        fontSize: 12,
                        width: 2 * 12 * TEXT_WIDTH_MULTIPLIER,
                    }
                )
            ).toBeTruthy()
        })
        it("Will split the text across multiple lines if there is a minimum number of lines needed", () => {
            textWidthSpy = vi
                .spyOn(mockGraphicsContext, "textWidth")
                .mockImplementation((text: string) => {
                    return text.length * 100
                })
            expect(
                expectTextFitToBeCloseTo(
                    TextHandlingService.fitTextWithinSpace({
                        text: "111 222 33",
                        maximumWidth: 9001,
                        font: {
                            fontSizeRange: {
                                preferred: 10,
                                minimum: 8,
                            },
                            strokeWeight: 1,
                        },
                        linesOfTextRange: {
                            minimum: 2,
                        },
                        graphicsContext: mockGraphicsContext,
                    }),
                    {
                        text: "111 222\n33",
                        fontSize: 10,
                        width: 70 * 10 * TEXT_WIDTH_MULTIPLIER,
                    }
                )
            ).toBeTruthy()
        })
        it("Will reduce the font size if it does not fit on a single line", () => {
            let fontSize = 20
            textSizeSpy = vi
                .spyOn(mockGraphicsContext, "textSize")
                .mockImplementation((size: number) => {
                    fontSize = size
                })
            textWidthSpy = vi
                .spyOn(mockGraphicsContext, "textWidth")
                .mockImplementation((text: string) => {
                    return text.length * fontSize
                })
            expect(
                expectTextFitToBeCloseTo(
                    TextHandlingService.fitTextWithinSpace({
                        text: "12345",
                        maximumWidth: 50,
                        font: {
                            fontSizeRange: {
                                preferred: 20,
                                minimum: 10,
                            },
                            strokeWeight: 1,
                        },
                        linesOfTextRange: {
                            minimum: 1,
                        },
                        graphicsContext: mockGraphicsContext,
                    }),
                    {
                        text: "12345",
                        fontSize: 10,
                        width: 50 * TEXT_WIDTH_MULTIPLIER,
                    }
                )
            ).toBeTruthy()
        })
    })
    it("can pad a + in front of positive numbers", () => {
        expect(TextHandlingService.padPlusOnPositiveNumber(3)).toEqual("+3")
        expect(TextHandlingService.padPlusOnPositiveNumber(0)).toEqual("0")
        expect(TextHandlingService.padPlusOnPositiveNumber(-5)).toEqual("-5")
    })
    it("can title case, only capitalizing the first letter of a word", () => {
        expect(TextHandlingService.titleCase("cat")).toEqual("Cat")
        expect(TextHandlingService.titleCase("CAT")).toEqual("Cat")
        expect(TextHandlingService.titleCase("0cat")).toEqual("0cat")
    })
    describe("split text on multiple lines", () => {
        let textWidthSpy: MockInstance
        let textSizeSpy: MockInstance

        beforeEach(() => {
            let fontSize = 20
            textSizeSpy = vi
                .spyOn(mockGraphicsContext, "textSize")
                .mockImplementation((size: number) => {
                    fontSize = size
                })
            textWidthSpy = vi
                .spyOn(mockGraphicsContext, "textWidth")
                .mockImplementation((text: string) => {
                    return text.length * fontSize
                })
        })

        afterEach(() => {
            if (textWidthSpy) textWidthSpy.mockRestore()
            if (textSizeSpy) textSizeSpy.mockRestore()
        })

        it("will add line breaks to split text on multiple lines", () => {
            expect(
                expectTextFitToBeCloseTo(
                    TextHandlingService.fitTextWithinSpace({
                        text: "1 3 5",
                        maximumWidth: 20,
                        font: {
                            fontSizeRange: {
                                preferred: 10,
                                minimum: 10,
                            },
                            strokeWeight: 1,
                        },
                        linesOfTextRange: {
                            minimum: 1,
                        },
                        graphicsContext: mockGraphicsContext,
                    }),
                    {
                        text: "1\n3\n5",
                        fontSize: 10,
                        width: 10 * TEXT_WIDTH_MULTIPLIER,
                    }
                )
            ).toBeTruthy()
        })

        it("will not add line breaks if already at the maximum lines of text", () => {
            expect(
                expectTextFitToBeCloseTo(
                    TextHandlingService.fitTextWithinSpace({
                        text: "1 3 5",
                        maximumWidth: 20,
                        font: {
                            fontSizeRange: {
                                preferred: 10,
                                minimum: 10,
                            },
                            strokeWeight: 1,
                        },
                        linesOfTextRange: {
                            maximum: 1,
                        },
                        graphicsContext: mockGraphicsContext,
                    }),
                    {
                        text: "1 3 5",
                        fontSize: 10,
                        width: 50 * TEXT_WIDTH_MULTIPLIER,
                    }
                )
            ).toBeTruthy()
        })

        it("will not modify the text if the only word is too long", () => {
            expect(
                expectTextFitToBeCloseTo(
                    TextHandlingService.fitTextWithinSpace({
                        text: "12345",
                        maximumWidth: 20,
                        font: {
                            fontSizeRange: {
                                preferred: 10,
                                minimum: 10,
                            },
                            strokeWeight: 1,
                        },
                        linesOfTextRange: {
                            minimum: 1,
                        },
                        graphicsContext: mockGraphicsContext,
                    }),
                    {
                        text: "12345",
                        fontSize: 10,
                        width: 50 * TEXT_WIDTH_MULTIPLIER,
                    }
                )
            ).toBeTruthy()
        })

        it("will move the second word to a new line if the first word is too long", () => {
            expect(
                expectTextFitToBeCloseTo(
                    TextHandlingService.fitTextWithinSpace({
                        text: "123 5",
                        maximumWidth: 20,
                        font: {
                            fontSizeRange: {
                                preferred: 10,
                                minimum: 10,
                            },
                            strokeWeight: 1,
                        },
                        linesOfTextRange: {
                            minimum: 1,
                        },
                        graphicsContext: mockGraphicsContext,
                    }),
                    {
                        text: "123\n5",
                        fontSize: 10,
                        width: 30 * TEXT_WIDTH_MULTIPLIER,
                    }
                )
            ).toBeTruthy()
        })

        it("will not modify text if the line is short enough", () => {
            expect(
                expectTextFitToBeCloseTo(
                    TextHandlingService.fitTextWithinSpace({
                        text: "12\n3\n5",
                        maximumWidth: 20,
                        font: {
                            fontSizeRange: {
                                preferred: 10,
                                minimum: 10,
                            },
                            strokeWeight: 1,
                        },
                        linesOfTextRange: {
                            minimum: 1,
                        },
                        graphicsContext: mockGraphicsContext,
                    }),
                    {
                        text: "12\n3\n5",
                        fontSize: 10,
                        width: 20 * TEXT_WIDTH_MULTIPLIER,
                    }
                )
            ).toBeTruthy()
        })
    })
})

const expectTextFitToBeCloseTo = (
    actual: TextFit,
    expected: TextFit
): boolean => {
    expect(actual.text).toEqual(expected.text)
    expect(actual.fontSize).toBeCloseTo(expected.fontSize)
    expect(actual.width).toBeCloseTo(expected.width)
    return true
}
