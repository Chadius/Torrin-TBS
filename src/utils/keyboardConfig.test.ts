import { KeyButtonName, KeyWasPressed } from "./keyboardConfig"

describe("Keyboard Config", () => {
    let nextSquaddieKeyCodes: number[]
    beforeEach(() => {
        nextSquaddieKeyCodes = JSON.parse(
            process.env.KEYBOARD_SHORTCUTS_BINDINGS_NEXT_SQUADDIE
        )
    })

    it("knows when a key was pressed", () => {
        expect(
            KeyWasPressed(KeyButtonName.NEXT_SQUADDIE, nextSquaddieKeyCodes[0])
        ).toBeTruthy()
        expect(
            KeyWasPressed(KeyButtonName.UNKNOWN, nextSquaddieKeyCodes[0])
        ).toBeFalsy()
        expect(KeyWasPressed(KeyButtonName.NEXT_SQUADDIE, 9001)).toBeFalsy()
    })
})
