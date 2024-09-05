import { config } from "../configuration/config"

export enum KeyButtonName {
    UNKNOWN = "UNKNOWN",
    NEXT_SQUADDIE = "NEXT_SQUADDIE",
    ACCEPT = "ACCEPT",
    CANCEL = "CANCEL",
}

export const KeyWasPressed = (
    desiredKey: KeyButtonName,
    keyCode: number
): boolean => {
    const KeyboardShortcuts: { [key in KeyButtonName]?: number[] } = {
        NEXT_SQUADDIE: config.KEYBOARD_SHORTCUTS["NEXT_SQUADDIE"],
        ACCEPT: config.KEYBOARD_SHORTCUTS["ACCEPT"],
        CANCEL: config.KEYBOARD_SHORTCUTS["CANCEL"],
    }

    return KeyboardShortcuts[desiredKey]?.includes(keyCode)
}
