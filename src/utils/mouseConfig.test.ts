import { MouseButton, MouseConfigService } from "./mouseConfig"
import { beforeEach, describe, expect, it } from "vitest"

describe("Mouse Config", () => {
    let mouseButtonAcceptMouseButtonName: string
    let mouseButtonInfoMouseButtonName: string
    let mouseButtonCancelMouseButtonName: string
    beforeEach(() => {
        mouseButtonAcceptMouseButtonName =
            process.env.MOUSE_BUTTON_BINDINGS_ACCEPT
        mouseButtonInfoMouseButtonName = process.env.MOUSE_BUTTON_BINDINGS_INFO
        mouseButtonCancelMouseButtonName =
            process.env.MOUSE_BUTTON_BINDINGS_CANCEL
    })

    it("knows when the mouse button was clicked and what functional button to assign it to", () => {
        expect(
            MouseConfigService.getMouseButton(mouseButtonAcceptMouseButtonName)
        ).toBe(MouseButton.ACCEPT)
        expect(
            MouseConfigService.getMouseButton(mouseButtonInfoMouseButtonName)
        ).toBe(MouseButton.INFO)
        expect(
            MouseConfigService.getMouseButton(mouseButtonCancelMouseButtonName)
        ).toBe(MouseButton.CANCEL)
    })

    describe("converts DragEvents into MouseDrag objects", () => {
        const tests = [
            {
                name: "accept button drag to the right",
                dragEvent: {
                    movementX: 100,
                    movementY: 0,
                    x: 20,
                    y: 30,
                    buttons: 1,
                },
                expectedMouseDrag: {
                    x: 20,
                    y: 30,
                    button: MouseButton.ACCEPT,
                    movementX: 1,
                    movementY: 0,
                },
            },
            {
                name: "cancel button drag to the left",
                dragEvent: {
                    movementX: -100,
                    movementY: 0,
                    x: 50,
                    y: 70,
                    buttons: 2,
                },
                expectedMouseDrag: {
                    x: 50,
                    y: 70,
                    button: MouseButton.CANCEL,
                    movementX: -1,
                    movementY: 0,
                },
            },
            {
                name: "info button drag up",
                dragEvent: {
                    movementX: 0,
                    movementY: -10,
                    x: 90,
                    y: 110,
                    buttons: 4,
                },
                expectedMouseDrag: {
                    x: 90,
                    y: 110,
                    button: MouseButton.INFO,
                    movementX: 0,
                    movementY: -1,
                },
            },
            {
                name: "no button drag down",
                dragEvent: {
                    movementX: 0,
                    movementY: 1000,
                    x: 130,
                    y: 170,
                    buttons: 0,
                },
                expectedMouseDrag: {
                    x: 130,
                    y: 170,
                    button: MouseButton.NONE,
                    movementX: 0,
                    movementY: 1,
                },
            },
        ]

        it.each(tests)(`$name`, ({ dragEvent, expectedMouseDrag }) => {
            expect(
                MouseConfigService.convertBrowserMouseEventToMouseDrag(
                    dragEvent
                )
            ).toEqual(expectedMouseDrag)
        })
    })
})
