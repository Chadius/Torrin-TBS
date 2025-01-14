import { ConvertCoordinateService } from "./convertCoordinates"
import { HEX_TILE_RADIUS, HEX_TILE_WIDTH } from "../graphicsConstants"
import { ScreenDimensions } from "../utils/graphics/graphicsConfig"
import { describe, expect, it } from "vitest"

describe("convertCoordinates", () => {
    it("converts world coordinates to map coordinates", () => {
        expect(
            ConvertCoordinateService.convertWorldLocationToMapCoordinates(0, 0)
        ).toEqual({ q: 0, r: 0 })
        expect(
            ConvertCoordinateService.convertWorldLocationToMapCoordinates(
                HEX_TILE_WIDTH,
                0
            )
        ).toEqual({ q: 0, r: 1 })
        expect(
            ConvertCoordinateService.convertWorldLocationToMapCoordinates(
                HEX_TILE_WIDTH / 2 + 1,
                (3 * HEX_TILE_RADIUS) / 2 + 1
            )
        ).toEqual({ q: 1, r: 0 })
        expect(
            ConvertCoordinateService.convertWorldLocationToMapCoordinates(
                HEX_TILE_WIDTH * -1,
                -3 * HEX_TILE_RADIUS + 1
            )
        ).toEqual({ q: -2, r: -0 })
    })

    it("converts map coordinates to world coordinates", () => {
        expect(
            ConvertCoordinateService.convertMapCoordinatesToWorldLocation(0, 0)
        ).toEqual({ worldX: 0, worldY: 0 })
        expect(
            ConvertCoordinateService.convertMapCoordinatesToWorldLocation(0, 1)
        ).toEqual({ worldX: HEX_TILE_WIDTH, worldY: 0 })
        expect(
            ConvertCoordinateService.convertMapCoordinatesToWorldLocation(1, 0)
        ).toEqual({
            worldX: HEX_TILE_WIDTH / 2,
            worldY: (3 * HEX_TILE_RADIUS) / 2,
        })
        expect(
            ConvertCoordinateService.convertMapCoordinatesToWorldLocation(-2, 0)
        ).toEqual({
            worldX: HEX_TILE_WIDTH * -1,
            worldY: -3 * HEX_TILE_RADIUS,
        })
    })

    it("converts world coordinates to screen coordinates", () => {
        expect(
            ConvertCoordinateService.convertWorldLocationToScreenLocation({
                worldX: 0,
                worldY: 0,
                cameraX: 0,
                cameraY: 0,
            })
        ).toEqual({
            screenX: ScreenDimensions.SCREEN_WIDTH / 2,
            screenY: ScreenDimensions.SCREEN_HEIGHT / 2,
        })

        expect(
            ConvertCoordinateService.convertWorldLocationToScreenLocation({
                worldX: 1,
                worldY: 0,
                cameraX: 0,
                cameraY: 0,
            })
        ).toEqual({
            screenX: 1 + ScreenDimensions.SCREEN_WIDTH / 2,
            screenY: ScreenDimensions.SCREEN_HEIGHT / 2,
        })
        expect(
            ConvertCoordinateService.convertWorldLocationToScreenLocation({
                worldX: 0,
                worldY: 1,
                cameraX: 0,
                cameraY: 0,
            })
        ).toEqual({
            screenX: ScreenDimensions.SCREEN_WIDTH / 2,
            screenY: 1 + ScreenDimensions.SCREEN_HEIGHT / 2,
        })

        expect(
            ConvertCoordinateService.convertWorldLocationToScreenLocation({
                worldX: 0,
                worldY: 0,
                cameraX: 0,
                cameraY: 1,
            })
        ).toEqual({
            screenX: ScreenDimensions.SCREEN_WIDTH / 2,
            screenY: -1 + ScreenDimensions.SCREEN_HEIGHT / 2,
        })
        expect(
            ConvertCoordinateService.convertWorldLocationToScreenLocation({
                worldX: 0,
                worldY: 1,
                cameraX: 0,
                cameraY: 0,
            })
        ).toEqual({
            screenX: ScreenDimensions.SCREEN_WIDTH / 2,
            screenY: 1 + ScreenDimensions.SCREEN_HEIGHT / 2,
        })
    })

    it("converts screen coordinates to world coordinates", () => {
        expect(
            ConvertCoordinateService.convertScreenLocationToWorldLocation({
                screenX: ScreenDimensions.SCREEN_WIDTH / 2,
                screenY: ScreenDimensions.SCREEN_HEIGHT / 2,
                cameraX: 0,
                cameraY: 0,
            })
        ).toEqual({ worldX: 0, worldY: 0 })

        expect(
            ConvertCoordinateService.convertScreenLocationToWorldLocation({
                screenX: ScreenDimensions.SCREEN_WIDTH / 2 + 1,
                screenY: ScreenDimensions.SCREEN_HEIGHT / 2,
                cameraX: 0,
                cameraY: 0,
            })
        ).toEqual({ worldX: 1, worldY: 0 })
        expect(
            ConvertCoordinateService.convertScreenLocationToWorldLocation({
                screenX: ScreenDimensions.SCREEN_WIDTH / 2,
                screenY: ScreenDimensions.SCREEN_HEIGHT / 2,
                cameraX: 1,
                cameraY: 0,
            })
        ).toEqual({ worldX: 1, worldY: 0 })

        expect(
            ConvertCoordinateService.convertScreenLocationToWorldLocation({
                screenX: ScreenDimensions.SCREEN_WIDTH / 2,
                screenY: ScreenDimensions.SCREEN_HEIGHT / 2 + 1,
                cameraX: 0,
                cameraY: 0,
            })
        ).toEqual({ worldX: 0, worldY: 1 })
        expect(
            ConvertCoordinateService.convertScreenLocationToWorldLocation({
                screenX: ScreenDimensions.SCREEN_WIDTH / 2,
                screenY: ScreenDimensions.SCREEN_HEIGHT / 2,
                cameraX: 0,
                cameraY: 1,
            })
        ).toEqual({ worldX: 0, worldY: 1 })
    })

    it("converts map coordinates to screen coordinates", () => {
        expect(
            ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                q: 0,
                r: 0,
                cameraX: 0,
                cameraY: 0,
            })
        ).toEqual({
            screenX: ScreenDimensions.SCREEN_WIDTH / 2,
            screenY: ScreenDimensions.SCREEN_HEIGHT / 2,
        })

        expect(
            ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                q: 0,
                r: 1,
                cameraX: 0,
                cameraY: 0,
            })
        ).toEqual({
            screenX: ScreenDimensions.SCREEN_WIDTH / 2 + HEX_TILE_WIDTH,
            screenY: ScreenDimensions.SCREEN_HEIGHT / 2,
        })

        expect(
            ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                q: 1,
                r: 0,
                cameraX: 0,
                cameraY: 0,
            })
        ).toEqual({
            screenX: ScreenDimensions.SCREEN_WIDTH / 2 + HEX_TILE_WIDTH / 2,
            screenY:
                ScreenDimensions.SCREEN_HEIGHT / 2 + (3 * HEX_TILE_RADIUS) / 2,
        })

        expect(
            ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                q: 0,
                r: 0,
                cameraX: 1,
                cameraY: 0,
            })
        ).toEqual({
            screenX: ScreenDimensions.SCREEN_WIDTH / 2 - 1,
            screenY: ScreenDimensions.SCREEN_HEIGHT / 2,
        })
        expect(
            ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                q: 0,
                r: 0,
                cameraX: 0,
                cameraY: 1,
            })
        ).toEqual({
            screenX: ScreenDimensions.SCREEN_WIDTH / 2,
            screenY: ScreenDimensions.SCREEN_HEIGHT / 2 - 1,
        })
    })

    it("converts screen coordinates to map coordinates", () => {
        expect(
            ConvertCoordinateService.convertScreenLocationToMapCoordinates({
                screenX: ScreenDimensions.SCREEN_WIDTH / 2,
                screenY: ScreenDimensions.SCREEN_HEIGHT / 2,
                cameraX: 0,
                cameraY: 0,
            })
        ).toEqual({ q: 0, r: 0 })

        expect(
            ConvertCoordinateService.convertScreenLocationToMapCoordinates({
                screenX: ScreenDimensions.SCREEN_WIDTH / 2 + HEX_TILE_WIDTH,
                screenY: ScreenDimensions.SCREEN_HEIGHT / 2,
                cameraX: 0,
                cameraY: 0,
            })
        ).toEqual({ q: 0, r: 1 })
        expect(
            ConvertCoordinateService.convertScreenLocationToMapCoordinates({
                screenX: ScreenDimensions.SCREEN_WIDTH / 2 + HEX_TILE_WIDTH / 2,
                screenY:
                    ScreenDimensions.SCREEN_HEIGHT / 2 +
                    (3 * HEX_TILE_RADIUS) / 2,
                cameraX: 0,
                cameraY: 0,
            })
        ).toEqual({ q: 1, r: 0 })

        expect(
            ConvertCoordinateService.convertScreenLocationToMapCoordinates({
                screenX: ScreenDimensions.SCREEN_WIDTH / 2,
                screenY: ScreenDimensions.SCREEN_HEIGHT / 2,
                cameraX: HEX_TILE_WIDTH * -1,
                cameraY: 0,
            })
        ).toEqual({ q: 0, r: -1 })
        expect(
            ConvertCoordinateService.convertScreenLocationToMapCoordinates({
                screenX: ScreenDimensions.SCREEN_WIDTH / 2,
                screenY: ScreenDimensions.SCREEN_HEIGHT / 2,
                cameraX: HEX_TILE_WIDTH / 2,
                cameraY: (3 * HEX_TILE_RADIUS) / 2,
            })
        ).toEqual({ q: 1, r: -0 })
    })
})
