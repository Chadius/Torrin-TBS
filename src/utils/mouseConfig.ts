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

export interface ScreenLocation {
    x: number
    y: number
}

export interface MousePress extends ScreenLocation {
    button: MouseButton
}

export interface MouseRelease extends ScreenLocation {
    button: MouseButton
}

export interface MouseRelease extends ScreenLocation {
    button: MouseButton
}

export interface MouseWheel extends ScreenLocation {
    deltaX: number
    deltaY: number
    shiftKey?: boolean
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
    }): MousePress => {
        return {
            x,
            y,
            button,
        }
    },
}
