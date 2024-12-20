import { TextBox, TextBoxService } from "./textBox"
import { RectAreaService } from "./rectArea"
import { MockedP5GraphicsBuffer } from "../utils/test/mocks"
import { beforeEach, describe, expect, it, MockInstance, vi } from "vitest"

describe("Pop up text", () => {
    let p5TextSpy: MockInstance
    let mockedP5GraphicsContext: MockedP5GraphicsBuffer

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsBuffer()
        p5TextSpy = vi
            .spyOn(mockedP5GraphicsContext.mockedP5, "text")
            .mockReturnValue(undefined)
    })

    it("will try to draw the text for a given amount of time", () => {
        vi.spyOn(Date, "now").mockImplementation(() => 0)
        const textBox: TextBox = TextBoxService.new({
            text: "A text box",
            textSize: 18,
            fontColor: [0, 0, 0],
            area: RectAreaService.new({
                left: 0,
                top: 0,
                width: 100,
                height: 50,
            }),
            duration: 1000,
        })

        TextBoxService.draw(textBox, mockedP5GraphicsContext)
        expect(TextBoxService.isDone(textBox)).toBeFalsy()

        vi.spyOn(Date, "now").mockImplementation(() => 1000)
        TextBoxService.draw(textBox, mockedP5GraphicsContext)
        expect(p5TextSpy).toBeCalledTimes(1)
        expect(TextBoxService.isDone(textBox)).toBeTruthy()
    })

    it("will draw the text if there is no duration", () => {
        const textBox: TextBox = TextBoxService.new({
            text: "A text box",
            textSize: 18,
            fontColor: [0, 0, 0],
            area: RectAreaService.new({
                left: 0,
                top: 0,
                width: 100,
                height: 50,
            }),
            duration: undefined,
        })

        vi.spyOn(Date, "now").mockImplementation(() => 0)
        TextBoxService.draw(textBox, mockedP5GraphicsContext)

        vi.spyOn(Date, "now").mockImplementation(() => 1000)
        TextBoxService.draw(textBox, mockedP5GraphicsContext)
        expect(p5TextSpy).toBeCalledTimes(2)
        expect(TextBoxService.isDone(textBox)).toBeFalsy()
    })
})
