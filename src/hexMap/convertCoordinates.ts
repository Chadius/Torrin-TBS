import { HEX_TILE_WIDTH } from "../graphicsConstants"
import { ScreenDimensions } from "../utils/graphics/graphicsConfig"
import { HexCoordinate } from "./hexCoordinate/hexCoordinate"
import { BattleCamera } from "../battle/battleCamera"
import { isValidValue } from "../utils/validityCheck"

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
    }): { x: number; y: number } => {
        const [screenX, screenY] = convertMapCoordinatesToScreenCoordinates(
            q,
            r,
            cameraX,
            cameraY
        )
        return {
            x: screenX,
            y: screenY,
        }
    },
    convertScreenCoordinatesToMapCoordinates: ({
        screenX,
        screenY,
        cameraX,
        cameraY,
        camera,
    }: {
        screenX: number
        screenY: number
        cameraX?: number
        cameraY?: number
        camera?: BattleCamera
    }): HexCoordinate => {
        if (isValidValue(camera)) {
            ;({ cameraX, cameraY } = camera.getCoordinatesAsObject())
        }

        const [q, r] = convertScreenCoordinatesToMapCoordinates(
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
}

export const convertWorldCoordinatesToMapCoordinates = (
    worldX: number,
    worldY: number,
    round: boolean = true
): [number, number] => {
    const xScaled = worldX / HEX_TILE_WIDTH
    const yScaled = worldY / HEX_TILE_WIDTH

    // q = 2 * yScaled / sqrt(3)
    const q = yScaled * 1.154

    // r = x - (y / sqrt(3))
    const r = xScaled - yScaled / 1.732

    if (round) {
        return [Math.round(q), Math.round(r)]
    }
    return [q, r]
}

export const convertMapCoordinatesToWorldCoordinates = (
    q: number,
    r: number
): [number, number] => {
    const y = (q * Math.sqrt(3)) / 2
    const x = r + q / 2
    return [x * HEX_TILE_WIDTH, y * HEX_TILE_WIDTH]
}

export const convertWorldCoordinatesToScreenCoordinates = (
    worldX: number,
    worldY: number,
    cameraX: number,
    cameraY: number
): [number, number] => {
    const screenX: number = worldX - cameraX + ScreenDimensions.SCREEN_WIDTH / 2
    const screenY: number =
        worldY - cameraY + ScreenDimensions.SCREEN_HEIGHT / 2

    return [screenX, screenY]
}

export const convertScreenCoordinatesToWorldCoordinates = (
    screenX: number,
    screenY: number,
    cameraX: number,
    cameraY: number
): [number, number] => {
    const worldX = screenX - ScreenDimensions.SCREEN_WIDTH / 2 + cameraX
    const worldY = screenY - ScreenDimensions.SCREEN_HEIGHT / 2 + cameraY

    return [worldX, worldY]
}

export const convertMapCoordinatesToScreenCoordinates = (
    q: number,
    r: number,
    cameraX: number,
    cameraY: number
): [number, number] => {
    const worldCoordinates = convertMapCoordinatesToWorldCoordinates(q, r)
    return convertWorldCoordinatesToScreenCoordinates(
        ...worldCoordinates,
        cameraX,
        cameraY
    )
}

export const convertScreenCoordinatesToMapCoordinates = (
    screenX: number,
    screenY: number,
    cameraX: number,
    cameraY: number
): [number, number] => {
    const [worldX, worldY] = convertScreenCoordinatesToWorldCoordinates(
        screenX,
        screenY,
        cameraX,
        cameraY
    )
    return convertWorldCoordinatesToMapCoordinates(worldX, worldY)
}
