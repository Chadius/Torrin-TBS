import {config} from "../../configuration/config";

export const ScreenDimensions = {
    SCREEN_WIDTH: config.SCREEN_WIDTH,
    SCREEN_HEIGHT: config.SCREEN_HEIGHT,
}

export const isCoordinateOnScreen: (xCoordinate: number, yCoordinate: number) => boolean = (xCoordinate: number, yCoordinate: number) => {
    return (
        xCoordinate >= 0
        && xCoordinate < ScreenDimensions.SCREEN_WIDTH
        && yCoordinate >= 0
        && yCoordinate < ScreenDimensions.SCREEN_HEIGHT
    );
}
