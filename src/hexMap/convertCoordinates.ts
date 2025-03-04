import { HEX_TILE_RADIUS, HEX_TILE_WIDTH } from "../graphicsConstants"
import { ScreenDimensions } from "../utils/graphics/graphicsConfig"
import { HexCoordinate } from "./hexCoordinate/hexCoordinate"
import { ScreenLocation } from "../utils/mouseConfig"

export const ConvertCoordinateService = {
    convertMapCoordinatesToScreenLocation: ({
        mapCoordinate,
        cameraLocation,
    }: {
        mapCoordinate: HexCoordinate
        cameraLocation: ScreenLocation
    }): ScreenLocation =>
        convertMapCoordinatesToScreenLocation({
            mapCoordinate,
            cameraLocation,
        }),
    convertScreenLocationToMapCoordinates: ({
        screenLocation,
        cameraLocation,
    }: {
        screenLocation: ScreenLocation
        cameraLocation: ScreenLocation
    }): HexCoordinate =>
        convertScreenLocationToMapCoordinates({
            screenLocation: screenLocation,
            cameraLocation: cameraLocation,
        }),
    convertMapCoordinatesToWorldLocation: ({
        mapCoordinate,
    }: {
        mapCoordinate: HexCoordinate
    }): ScreenLocation => ({
        x: (mapCoordinate.r + mapCoordinate.q / 2) * HEX_TILE_WIDTH,
        y: (3 * mapCoordinate.q * HEX_TILE_RADIUS) / 2,
    }),
    convertScreenLocationToWorldLocation: ({
        screenLocation,
        cameraLocation,
    }: {
        screenLocation: ScreenLocation
        cameraLocation: ScreenLocation
    }): ScreenLocation =>
        convertScreenLocationToWorldLocation({
            screenLocation: screenLocation,
            cameraLocation: cameraLocation,
        }),
    convertWorldLocationToMapCoordinates: ({
        worldLocation,
        round,
    }: {
        worldLocation: ScreenLocation
        round?: boolean
    }): HexCoordinate =>
        convertWorldLocationToMapCoordinates({
            worldLocation: worldLocation,
            round: round,
        }),
    convertWorldLocationToScreenLocation: ({
        worldLocation,
        cameraLocation,
    }: {
        worldLocation: ScreenLocation
        cameraLocation: ScreenLocation
    }): ScreenLocation =>
        convertWorldLocationToScreenLocation({
            worldLocation,
            cameraLocation,
        }),
}

const convertWorldLocationToMapCoordinates = ({
    worldLocation,
    round = true,
}: {
    worldLocation: ScreenLocation
    round?: boolean
}): HexCoordinate => {
    const q = (2 * worldLocation.y) / (3 * HEX_TILE_RADIUS)
    const r =
        (worldLocation.x * Math.sqrt(3) - worldLocation.y) /
        (3 * HEX_TILE_RADIUS)

    if (round) {
        return { q: Math.round(q), r: Math.round(r) }
    }
    return { q, r }
}

const convertWorldLocationToScreenLocation = ({
    worldLocation,
    cameraLocation,
}: {
    worldLocation: ScreenLocation
    cameraLocation: ScreenLocation
}): ScreenLocation => ({
    x: worldLocation.x - cameraLocation.x + ScreenDimensions.SCREEN_WIDTH / 2,
    y: worldLocation.y - cameraLocation.y + ScreenDimensions.SCREEN_HEIGHT / 2,
})

const convertScreenLocationToWorldLocation = ({
    screenLocation,
    cameraLocation,
}: {
    screenLocation: ScreenLocation
    cameraLocation: ScreenLocation
}): ScreenLocation => ({
    x: screenLocation.x - ScreenDimensions.SCREEN_WIDTH / 2 + cameraLocation.x,
    y: screenLocation.y - ScreenDimensions.SCREEN_HEIGHT / 2 + cameraLocation.y,
})

const convertMapCoordinatesToScreenLocation = ({
    mapCoordinate,
    cameraLocation,
}: {
    mapCoordinate: HexCoordinate
    cameraLocation: ScreenLocation
}): ScreenLocation => {
    return convertWorldLocationToScreenLocation({
        worldLocation:
            ConvertCoordinateService.convertMapCoordinatesToWorldLocation({
                mapCoordinate: mapCoordinate,
            }),
        cameraLocation,
    })
}

const convertScreenLocationToMapCoordinates = ({
    screenLocation,
    cameraLocation,
}: {
    screenLocation: ScreenLocation
    cameraLocation: ScreenLocation
}): HexCoordinate =>
    convertWorldLocationToMapCoordinates({
        worldLocation: convertScreenLocationToWorldLocation({
            screenLocation: screenLocation,
            cameraLocation: cameraLocation,
        }),
    })
