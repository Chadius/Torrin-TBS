import {config} from "../configuration/config";

export enum KeyButtonName {
    UNKNOWN = "UNKNOWN",
    NEXT_SQUADDIE = "NEXT_SQUADDIE",
    ACCEPT = "ACCEPT",
}

export const KeyWasPressed = (desiredKey: KeyButtonName, keyCode: number): boolean => {
    const KeyboardShortcuts: { [key in KeyButtonName]?: number[] } = {
        "NEXT_SQUADDIE": config.KEYBOARD_SHORTCUTS["NEXT_SQUADDIE"],
        "ACCEPT": config.KEYBOARD_SHORTCUTS["ACCEPT"],
    }

    return KeyboardShortcuts[desiredKey] !== undefined && KeyboardShortcuts[desiredKey].includes(keyCode);
}
