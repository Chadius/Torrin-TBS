import { BattleCamera } from "../../battle/battleCamera"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"
import { ConvertCoordinateService } from "../../hexMap/convertCoordinates"

const screenWidth = process.env.SCREEN_WIDTH
const screenHeight = process.env.SCREEN_HEIGHT

export const ScreenDimensions = {
    SCREEN_WIDTH: Number(screenWidth),
    SCREEN_HEIGHT: Number(screenHeight),
}

export const GraphicsConfig = {
    isLocationOnScreen: (x: number, y: number): boolean =>
        isLocationOnScreen(x, y),
    isLocationWithinMiddleThirdOfScreen: (x: number, y: number): boolean =>
        isLocationWithinMiddleThirdOfScreen(x, y),
    isMapCoordinateOnScreen: ({
        camera,
        mapCoordinate,
    }: {
        camera: BattleCamera
        mapCoordinate: HexCoordinate
    }): boolean => {
        if (mapCoordinate == undefined) return false

        const screenLocation =
            ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                mapCoordinate,
                cameraLocation: camera.getWorldLocation(),
            })
        return GraphicsConfig.isLocationOnScreen(
            screenLocation.x,
            screenLocation.y
        )
    },
}

const isLocationOnScreen: (x: number, y: number) => boolean = (
    x: number,
    y: number
) =>
    x >= 0 &&
    x < ScreenDimensions.SCREEN_WIDTH &&
    y >= 0 &&
    y < ScreenDimensions.SCREEN_HEIGHT

const isLocationWithinMiddleThirdOfScreen: (x: number, y: number) => boolean = (
    x: number,
    y: number
) =>
    x >= ScreenDimensions.SCREEN_WIDTH / 3 &&
    x < (ScreenDimensions.SCREEN_WIDTH * 2) / 3 &&
    y >= ScreenDimensions.SCREEN_HEIGHT / 3 &&
    y < (ScreenDimensions.SCREEN_HEIGHT * 2) / 3
