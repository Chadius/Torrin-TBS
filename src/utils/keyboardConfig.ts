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
        NEXT_SQUADDIE: JSON.parse(
            process.env.KEYBOARD_SHORTCUTS_BINDINGS_NEXT_SQUADDIE
        ),
        ACCEPT: JSON.parse(process.env.KEYBOARD_SHORTCUTS_BINDINGS_ACCEPT),
        CANCEL: JSON.parse(process.env.KEYBOARD_SHORTCUTS_BINDINGS_CANCEL),
    }

    return KeyboardShortcuts[desiredKey]?.includes(keyCode)
}
