import { HEX_TILE_RADIUS, HEX_TILE_WIDTH } from "../graphicsConstants"
import { ScreenDimensions } from "../utils/graphics/graphicsConfig"
import { HexCoordinate } from "./hexCoordinate/hexCoordinate"

export const ConvertCoordinateService = {
    convertMapCoordinatesToScreenCoordinates: ({
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
        const { screenX, screenY } = convertMapCoordinatesToScreenCoordinates(
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
    convertScreenCoordinatesToMapCoordinates: ({
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
        const { q, r } = convertScreenCoordinatesToMapCoordinates(
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
    convertMapCoordinatesToWorldCoordinates: (
        q: number,
        r: number
    ): { worldX: number; worldY: number } => {
        const x = r + q / 2
        return {
            worldX: x * HEX_TILE_WIDTH,
            worldY: (3 * q * HEX_TILE_RADIUS) / 2,
        }
    },
    convertScreenCoordinatesToWorldCoordinates: ({
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
        convertScreenCoordinatesToWorldCoordinates(
            screenX,
            screenY,
            cameraX,
            cameraY
        ),
    convertWorldCoordinatesToMapCoordinates: (
        worldX: number,
        worldY: number,
        round: boolean = true
    ): { q: number; r: number } =>
        convertWorldCoordinatesToMapCoordinates(worldX, worldY, round),
    convertWorldCoordinatesToScreenCoordinates: ({
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
        convertWorldCoordinatesToScreenCoordinates({
            worldX,
            worldY,
            cameraX,
            cameraY,
        }),
}

const convertWorldCoordinatesToMapCoordinates = (
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

const convertWorldCoordinatesToScreenCoordinates = ({
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

const convertScreenCoordinatesToWorldCoordinates = (
    screenX: number,
    screenY: number,
    cameraX: number,
    cameraY: number
): { worldX: number; worldY: number } => {
    const worldX = screenX - ScreenDimensions.SCREEN_WIDTH / 2 + cameraX
    const worldY = screenY - ScreenDimensions.SCREEN_HEIGHT / 2 + cameraY

    return { worldX, worldY }
}

const convertMapCoordinatesToScreenCoordinates = (
    q: number,
    r: number,
    cameraX: number,
    cameraY: number
): { screenX: number; screenY: number } => {
    const worldCoordinates =
        ConvertCoordinateService.convertMapCoordinatesToWorldCoordinates(q, r)
    return convertWorldCoordinatesToScreenCoordinates({
        ...worldCoordinates,
        cameraX,
        cameraY,
    })
}

const convertScreenCoordinatesToMapCoordinates = (
    screenX: number,
    screenY: number,
    cameraX: number,
    cameraY: number
): { q: number; r: number } => {
    const { worldX, worldY } = convertScreenCoordinatesToWorldCoordinates(
        screenX,
        screenY,
        cameraX,
        cameraY
    )
    return convertWorldCoordinatesToMapCoordinates(worldX, worldY)
}
