import { KeyButtonName, KeyWasPressed } from "./keyboardConfig"
import { config } from "../configuration/config"

describe("Keyboard Config", () => {
    it("knows when a key was pressed", () => {
        expect(
            KeyWasPressed(
                KeyButtonName.NEXT_SQUADDIE,
                config.KEYBOARD_SHORTCUTS[KeyButtonName.NEXT_SQUADDIE][0]
            )
        ).toBeTruthy()
        expect(
            KeyWasPressed(
                KeyButtonName.UNKNOWN,
                config.KEYBOARD_SHORTCUTS[KeyButtonName.NEXT_SQUADDIE][0]
            )
        ).toBeFalsy()
        expect(KeyWasPressed(KeyButtonName.NEXT_SQUADDIE, 9001)).toBeFalsy()
    })
})
