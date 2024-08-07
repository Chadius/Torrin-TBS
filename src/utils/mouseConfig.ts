import { config } from "../configuration/config"

export enum MouseButton {
    NONE = "NONE",
    ACCEPT = "ACCEPT",
    INFO = "INFO",
    CANCEL = "CANCEL",
}

export const GetMouseButton = (physicalMouseButton: string): MouseButton => {
    switch (physicalMouseButton) {
        case config.MOUSE_BUTTON_BINDINGS[MouseButton.ACCEPT]:
            return MouseButton.ACCEPT
        case config.MOUSE_BUTTON_BINDINGS[MouseButton.CANCEL]:
            return MouseButton.CANCEL
        case config.MOUSE_BUTTON_BINDINGS[MouseButton.INFO]:
            return MouseButton.INFO
    }
    return MouseButton.NONE
}
