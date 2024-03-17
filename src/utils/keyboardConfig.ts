import {config} from "../configuration/config";

export enum KeyButtonName {
    UNKNOWN = "UNKNOWN",
    NEXT_SQUADDIE = "NEXT_SQUADDIE",
    ACCEPT = "ACCEPT",
    SWAP_HUD = "SWAP_HUD",
}

export const KeyWasPressed = (desiredKey: KeyButtonName, keyCode: number): boolean => {
    const KeyboardShortcuts: { [key in KeyButtonName]?: number[] } = {
        NEXT_SQUADDIE: config.KEYBOARD_SHORTCUTS["NEXT_SQUADDIE"],
        ACCEPT: config.KEYBOARD_SHORTCUTS["ACCEPT"],
        SWAP_HUD: config.KEYBOARD_SHORTCUTS["SWAP_HUD"],
    }

    return KeyboardShortcuts[desiredKey] !== undefined && KeyboardShortcuts[desiredKey].includes(keyCode);
}
