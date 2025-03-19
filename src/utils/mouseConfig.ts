export enum MouseButton {
    NONE = "NONE",
    ACCEPT = "ACCEPT",
    INFO = "INFO",
    CANCEL = "CANCEL",
}

const convertButtonsToHighestPriorityMouseButton = (
    buttons?: number
): MouseButton => {
    switch (true) {
        case buttons == undefined:
            return MouseButton.NONE
        case buttons == 0:
            return MouseButton.NONE
        case buttons == 1:
            return MouseButton.ACCEPT
        case buttons < 4:
            return MouseButton.CANCEL
        default:
            return MouseButton.INFO
    }
}

const getMouseButton = (physicalMouseButton: string): MouseButton => {
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

export interface MouseDrag extends ScreenLocation {
    button: MouseButton
    movementX: -1 | 0 | 1
    movementY: -1 | 0 | 1
}

export const MouseConfigService = {
    newMouseClick: ({
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
    convertBrowserMouseEventToMouseDrag: (event: any): MouseDrag => {
        let button: MouseButton = convertButtonsToHighestPriorityMouseButton(
            event.buttons
        )

        let getSign = (input?: number) => {
            switch (true) {
                case input == undefined:
                    return 0
                case input < 0:
                    return -1
                case input > 0:
                    return 1
                default:
                    return 0
            }
        }

        return {
            x: event.x,
            y: event.y,
            button,
            movementX: getSign(event.movementX),
            movementY: getSign(event.movementY),
        }
    },
    getMouseButton,
}
