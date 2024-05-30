import { config } from "../../configuration/config"

export const ScreenDimensions = {
    SCREEN_WIDTH: config.SCREEN_WIDTH,
    SCREEN_HEIGHT: config.SCREEN_HEIGHT,
}

export const GraphicsConfig = {
    isCoordinateOnScreen: (
        xCoordinate: number,
        yCoordinate: number
    ): boolean => {
        return isCoordinateOnScreen(xCoordinate, yCoordinate)
    },
    isCoordinateWithinMiddleThirdOfScreen: (
        xCoordinate: number,
        yCoordinate: number
    ): boolean => {
        return isCoordinateWithinMiddleThirdOfScreen(xCoordinate, yCoordinate)
    },
}

const isCoordinateOnScreen: (
    xCoordinate: number,
    yCoordinate: number
) => boolean = (xCoordinate: number, yCoordinate: number) => {
    return (
        xCoordinate >= 0 &&
        xCoordinate < ScreenDimensions.SCREEN_WIDTH &&
        yCoordinate >= 0 &&
        yCoordinate < ScreenDimensions.SCREEN_HEIGHT
    )
}

const isCoordinateWithinMiddleThirdOfScreen: (
    xCoordinate: number,
    yCoordinate: number
) => boolean = (xCoordinate: number, yCoordinate: number) => {
    return (
        xCoordinate >= ScreenDimensions.SCREEN_WIDTH / 3 &&
        xCoordinate < (ScreenDimensions.SCREEN_WIDTH * 2) / 3 &&
        yCoordinate >= ScreenDimensions.SCREEN_HEIGHT / 3 &&
        yCoordinate < (ScreenDimensions.SCREEN_HEIGHT * 2) / 3
    )
}
