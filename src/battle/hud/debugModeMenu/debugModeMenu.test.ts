import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
} from "vitest"
import { DebugModeMenu, DebugModeMenuService } from "./debugModeMenu"
import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"
import {
    MockedGraphicsBufferService,
    MockedP5GraphicsBuffer,
} from "../../../utils/test/mocks"

describe("Debug Mode Menu", () => {
    let debugModeMenu: DebugModeMenu
    let graphicsContext: GraphicsBuffer
    let graphicsBufferSpies: { [key: string]: MockInstance }

    beforeEach(() => {
        graphicsContext = new MockedP5GraphicsBuffer()
        graphicsBufferSpies =
            MockedGraphicsBufferService.addSpies(graphicsContext)
    })

    afterEach(() => {
        MockedGraphicsBufferService.resetSpies(graphicsBufferSpies)
    })

    it("will try to draw a title", () => {
        debugModeMenu = DebugModeMenuService.new()
        DebugModeMenuService.draw({ debugModeMenu, graphicsContext })
        expect(graphicsBufferSpies["text"]).toBeCalledWith(
            "DEBUG MODE",
            expect.anything(),
            expect.anything(),
            expect.anything(),
            expect.anything()
        )
    })
})
