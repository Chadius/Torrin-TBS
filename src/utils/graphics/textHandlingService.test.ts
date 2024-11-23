import { TextHandlingService } from "./textHandlingService"
import { MockedP5GraphicsBuffer } from "../test/mocks"

describe("Text Handling Service", () => {
    let mockGraphicsContext: MockedP5GraphicsBuffer

    beforeEach(() => {
        mockGraphicsContext = new MockedP5GraphicsBuffer()
    })

    it("asks the graphics buffer for the text width", () => {
        let pushSpy = jest.spyOn(mockGraphicsContext, "push")
        let popSpy = jest.spyOn(mockGraphicsContext, "pop")
        let textSizeSpy = jest.spyOn(mockGraphicsContext, "textSize")
        let strokeWeightSpy = jest.spyOn(mockGraphicsContext, "strokeWeight")
        let textWidthSpy = jest
            .spyOn(mockGraphicsContext, "textWidth")
            .mockReturnValue(9001)

        expect(
            TextHandlingService.calculateLengthOfLineOfText({
                text: "Wow! 3 Apples!",
                textSize: 10,
                strokeWeight: 3,
                graphicsContext: mockGraphicsContext,
            })
        ).toBeCloseTo(9001 * 1.2)

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
    test.each`
        inputString     | approximateLength
        ${"ABCDEFG"}    | ${0.8 * 10 * 7}
        ${"01234"}      | ${0.8 * 10 * 5}
        ${"a sly fox."} | ${0.62 * 10 * 10}
    `(
        "$inputString estimated length is close to: $approximateLength",
        ({ inputString, approximateLength }) => {
            expect(
                TextHandlingService.approximateLengthOfLineOfText({
                    text: inputString,
                    textSize: 10,
                    strokeWeight: 1,
                })
            ).toBeCloseTo(approximateLength)
        }
    )
    describe("determine font size", () => {
        let textWidthSpy: jest.SpyInstance
        let textSizeSpy: jest.SpyInstance

        beforeEach(() => {})

        afterEach(() => {
            if (textWidthSpy) textWidthSpy.mockRestore()
            if (textSizeSpy) textSizeSpy.mockRestore()
        })

        it("Returns default font size if text fits on one line", () => {
            textWidthSpy = jest
                .spyOn(mockGraphicsContext, "textWidth")
                .mockReturnValue(24)
            expect(
                TextHandlingService.fitTextWithinSpace({
                    text: "Hi",
                    width: 9001,
                    fontSizeRange: {
                        preferred: 12,
                        minimum: 8,
                    },
                    linesOfTextRange: {
                        minimum: 1,
                    },
                    graphicsContext: mockGraphicsContext,
                })
            ).toEqual({
                text: "Hi",
                textSize: 12,
                width: 24,
            })
        })
        it("Will split the text across multiple lines if it does not fit on a single line", () => {
            textWidthSpy = jest
                .spyOn(mockGraphicsContext, "textWidth")
                .mockImplementation((text: string) => {
                    return text.length * 100
                })
            expect(
                TextHandlingService.fitTextWithinSpace({
                    text: "111 222 33",
                    width: 9001,
                    fontSizeRange: {
                        preferred: 10,
                        minimum: 8,
                    },
                    linesOfTextRange: {
                        minimum: 2,
                    },
                    graphicsContext: mockGraphicsContext,
                })
            ).toEqual({
                text: "111 222\n33",
                textSize: 10,
                width: 700,
            })
        })
        it("Will reduce the font size if it does not fit on a single line", () => {
            let textSize = 20
            textSizeSpy = jest
                .spyOn(mockGraphicsContext, "textSize")
                .mockImplementation((size: number) => {
                    textSize = size
                })
            textWidthSpy = jest
                .spyOn(mockGraphicsContext, "textWidth")
                .mockImplementation((text: string) => {
                    return text.length * textSize
                })
            expect(
                TextHandlingService.fitTextWithinSpace({
                    text: "12345",
                    width: 50,
                    fontSizeRange: {
                        preferred: 20,
                        minimum: 10,
                    },
                    linesOfTextRange: {
                        minimum: 1,
                    },
                    graphicsContext: mockGraphicsContext,
                })
            ).toEqual({
                text: "12345",
                textSize: 10,
                width: 50,
            })
        })
    })
})
