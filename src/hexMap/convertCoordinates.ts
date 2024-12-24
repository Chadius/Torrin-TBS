import { HEX_TILE_RADIUS, HEX_TILE_WIDTH } from "../graphicsConstants"
import { ScreenDimensions } from "../utils/graphics/graphicsConfig"
import { HexCoordinate } from "./hexCoordinate/hexCoordinate"

export const ConvertCoordinateService = {
    convertMapCoordinatesToScreenLocation: ({
        q,
        r,
        cameraX,
        cameraY,
    }: {
        q: number
        r: number
        cameraX: number
        cameraY: number
    }): { screenX: number; screenY: number } => {
        const { screenX, screenY } = convertMapCoordinatesToScreenLocation(
            q,
            r,
            cameraX,
            cameraY
        )
        return {
            screenX,
            screenY,
        }
    },
    convertScreenLocationToMapCoordinates: ({
        screenX,
        screenY,
        cameraX,
        cameraY,
    }: {
        screenX: number
        screenY: number
        cameraX: number
        cameraY: number
    }): HexCoordinate => {
        const { q, r } = convertScreenLocationToMapCoordinates(
            screenX,
            screenY,
            cameraX,
            cameraY
        )
        return {
            q,
            r,
        }
    },
    convertMapCoordinatesToWorldLocation: (
        q: number,
        r: number
    ): { worldX: number; worldY: number } => {
        const x = r + q / 2
        return {
            worldX: x * HEX_TILE_WIDTH,
            worldY: (3 * q * HEX_TILE_RADIUS) / 2,
        }
    },
    convertScreenLocationToWorldLocation: ({
        screenX,
        screenY,
        cameraX,
        cameraY,
    }: {
        screenX: number
        screenY: number
        cameraX: number
        cameraY: number
    }): { worldX: number; worldY: number } =>
        convertScreenLocationToWorldLocation(
            screenX,
            screenY,
            cameraX,
            cameraY
        ),
    convertWorldLocationToMapCoordinates: (
        worldX: number,
        worldY: number,
        round: boolean = true
    ): { q: number; r: number } =>
        convertWorldLocationToMapCoordinates(worldX, worldY, round),
    convertWorldLocationToScreenLocation: ({
        worldX,
        worldY,
        cameraX,
        cameraY,
    }: {
        worldX: number
        worldY: number
        cameraX: number
        cameraY: number
    }): { screenX: number; screenY: number } =>
        convertWorldLocationToScreenLocation({
            worldX,
            worldY,
            cameraX,
            cameraY,
        }),
}

const convertWorldLocationToMapCoordinates = (
    worldX: number,
    worldY: number,
    round: boolean = true
): { q: number; r: number } => {
    const q = (2 * worldY) / (3 * HEX_TILE_RADIUS)
    const r = (worldX * Math.sqrt(3) - worldY) / (3 * HEX_TILE_RADIUS)

    if (round) {
        return { q: Math.round(q), r: Math.round(r) }
    }
    return { q, r }
}

const convertWorldLocationToScreenLocation = ({
    worldX,
    worldY,
    cameraX,
    cameraY,
}: {
    worldX: number
    worldY: number
    cameraX: number
    cameraY: number
}): { screenX: number; screenY: number } => {
    const screenX: number = worldX - cameraX + ScreenDimensions.SCREEN_WIDTH / 2
    const screenY: number =
        worldY - cameraY + ScreenDimensions.SCREEN_HEIGHT / 2

    return { screenX, screenY }
}

const convertScreenLocationToWorldLocation = (
    screenX: number,
    screenY: number,
    cameraX: number,
    cameraY: number
): { worldX: number; worldY: number } => {
    const worldX = screenX - ScreenDimensions.SCREEN_WIDTH / 2 + cameraX
    const worldY = screenY - ScreenDimensions.SCREEN_HEIGHT / 2 + cameraY

    return { worldX, worldY }
}

const convertMapCoordinatesToScreenLocation = (
    q: number,
    r: number,
    cameraX: number,
    cameraY: number
): { screenX: number; screenY: number } => {
    const worldCoordinates =
        ConvertCoordinateService.convertMapCoordinatesToWorldLocation(q, r)
    return convertWorldLocationToScreenLocation({
        ...worldCoordinates,
        cameraX,
        cameraY,
    })
}

const convertScreenLocationToMapCoordinates = (
    screenX: number,
    screenY: number,
    cameraX: number,
    cameraY: number
): { q: number; r: number } => {
    const { worldX, worldY } = convertScreenLocationToWorldLocation(
        screenX,
        screenY,
        cameraX,
        cameraY
    )
    return convertWorldLocationToMapCoordinates(worldX, worldY)
}
