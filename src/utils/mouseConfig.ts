export const MouseButton = {
    NONE: "NONE",
    ACCEPT: "ACCEPT",
    INFO: "INFO",
    CANCEL: "CANCEL",
} as const satisfies Record<string, string>
export type TMouseButton = EnumLike<typeof MouseButton>

const convertButtonsToHighestPriorityMouseButton = (
    buttons?: number
): TMouseButton => {
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

const getMouseButton = (physicalMouseButton: string): TMouseButton => {
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
    button: TMouseButton
}

export interface MouseRelease extends ScreenLocation {
    button: TMouseButton
}

export interface MouseRelease extends ScreenLocation {
    button: TMouseButton
}

export interface MouseWheel extends ScreenLocation {
    deltaX: number
    deltaY: number
    shiftKey?: boolean
}

export interface MouseDrag extends ScreenLocation {
    button: TMouseButton
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
        button: TMouseButton
    }): MousePress => {
        return {
            x,
            y,
            button,
        }
    },
    convertBrowserMouseEventToMouseDrag: (event: any): MouseDrag => {
        let button: TMouseButton = convertButtonsToHighestPriorityMouseButton(
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
