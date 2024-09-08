export enum MouseButton {
    NONE = "NONE",
    ACCEPT = "ACCEPT",
    INFO = "INFO",
    CANCEL = "CANCEL",
}

export const GetMouseButton = (physicalMouseButton: string): MouseButton => {
    switch (physicalMouseButton) {
        case process.env.MOUSE_BUTTON_BINDINGS_ACCEPT:
            return MouseButton.ACCEPT
        case process.env.MOUSE_BUTTON_BINDINGS_CANCEL:
            return MouseButton.CANCEL
        case process.env.MOUSE_BUTTON_BINDINGS_INFO:
            return MouseButton.INFO
    }
    return MouseButton.NONE
}

export interface ScreenCoordinate {
    x: number
    y: number
}

export interface MouseClick extends ScreenCoordinate {
    button: MouseButton
}

export const MouseClickService = {
    new: ({
        x,
        y,
        button,
    }: {
        x: number
        y: number
        button: MouseButton
    }): MouseClick => {
        return {
            x,
            y,
            button,
        }
    },
}
