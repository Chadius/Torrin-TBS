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
import { MouseButton } from "../../../utils/mouseConfig"
import { RectArea, RectAreaService } from "../../../ui/rectArea"

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

    describe("clicking on menu button", () => {
        beforeEach(() => {
            debugModeMenu = DebugModeMenuService.new()
            DebugModeMenuService.draw({ debugModeMenu, graphicsContext })
            clickOnDebugModeToggle(debugModeMenu)
        })
        it("should open the menu when clicked", () => {
            DebugModeMenuService.draw({ debugModeMenu, graphicsContext })
            expect(debugModeMenu.data.getContext().isMenuOpen).toBeTruthy()
        })
        it("should close the menu when the button is clicked again", () => {
            clickOnDebugModeToggle(debugModeMenu)
            DebugModeMenuService.draw({ debugModeMenu, graphicsContext })
            expect(debugModeMenu.data.getContext().isMenuOpen).toBeFalsy()
        })
    })
    describe("override offensive behavior", () => {
        beforeEach(() => {
            debugModeMenu = DebugModeMenuService.new()
            DebugModeMenuService.draw({ debugModeMenu, graphicsContext })
            clickOnDebugModeToggle(debugModeMenu)
            DebugModeMenuService.draw({ debugModeMenu, graphicsContext })
        })
        it("by default override is off", () => {
            expect(
                DebugModeMenuService.getDebugModeFlags(debugModeMenu)
                    .behaviorOverrides
            ).toEqual(
                expect.objectContaining({
                    noActions: false,
                })
            )
        })
        it("should export the flag when clicked", () => {
            clickOnBehaviorOverrideToggleNoActionButton(debugModeMenu)
            expect(
                DebugModeMenuService.getDebugModeFlags(debugModeMenu)
                    .behaviorOverrides
            ).toEqual(
                expect.objectContaining({
                    noActions: true,
                })
            )
        })
    })
})

const clickOnDebugModeToggle = (debugModeMenu: DebugModeMenu) => {
    clickOnButton(
        debugModeMenu,
        debugModeMenu.data.getUIObjects().toggleMenuButton!.getArea()
    )
}

const clickOnBehaviorOverrideToggleNoActionButton = (
    debugModeMenu: DebugModeMenu
) => {
    clickOnButton(
        debugModeMenu,
        debugModeMenu.data
            .getUIObjects()
            .behaviorOverrideToggleNoActionButton!.getArea()
    )
}

const clickOnButton = (debugModeMenu: DebugModeMenu, buttonArea: RectArea) => {
    DebugModeMenuService.mousePressed({
        debugModeMenu,
        mousePress: {
            button: MouseButton.ACCEPT,
            x: RectAreaService.centerX(buttonArea),
            y: RectAreaService.centerY(buttonArea),
        },
    })
    DebugModeMenuService.mouseReleased({
        debugModeMenu,
        mouseRelease: {
            button: MouseButton.ACCEPT,
            x: RectAreaService.centerX(buttonArea),
            y: RectAreaService.centerY(buttonArea),
        },
    })
}
