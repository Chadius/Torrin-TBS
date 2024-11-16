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
})
