import { GetMouseButton, MouseButton } from "./mouseConfig"
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
        expect(GetMouseButton(mouseButtonAcceptMouseButtonName)).toBe(
            MouseButton.ACCEPT
        )
        expect(GetMouseButton(mouseButtonInfoMouseButtonName)).toBe(
            MouseButton.INFO
        )
        expect(GetMouseButton(mouseButtonCancelMouseButtonName)).toBe(
            MouseButton.CANCEL
        )
    })
})
