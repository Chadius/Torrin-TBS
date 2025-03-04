import { ConvertCoordinateService } from "./convertCoordinates"
import { HEX_TILE_RADIUS, HEX_TILE_WIDTH } from "../graphicsConstants"
import { ScreenDimensions } from "../utils/graphics/graphicsConfig"
import { describe, expect, it } from "vitest"

describe("convertCoordinates", () => {
    it("converts world coordinates to map coordinates", () => {
        expect(
            ConvertCoordinateService.convertWorldLocationToMapCoordinates({
                worldLocation: { x: 0, y: 0 },
            })
        ).toEqual({ q: 0, r: 0 })
        let convertedCoordinates =
            ConvertCoordinateService.convertWorldLocationToMapCoordinates({
                worldLocation: { x: HEX_TILE_WIDTH, y: 0 },
            })
        expect(convertedCoordinates.q).toBeCloseTo(0)
        expect(convertedCoordinates.r).toBeCloseTo(1)

        convertedCoordinates =
            ConvertCoordinateService.convertWorldLocationToMapCoordinates({
                worldLocation: {
                    x: HEX_TILE_WIDTH / 2 + 1,
                    y: (3 * HEX_TILE_RADIUS) / 2 + 1,
                },
            })
        expect(convertedCoordinates.q).toBeCloseTo(1)
        expect(convertedCoordinates.r).toBeCloseTo(0)

        expect(
            ConvertCoordinateService.convertWorldLocationToMapCoordinates({
                worldLocation: {
                    x: HEX_TILE_WIDTH * -1,
                    y: -3 * HEX_TILE_RADIUS + 1,
                },
            })
        ).toEqual({ q: -2, r: -0 })
    })

    it("converts map coordinates to world coordinates", () => {
        expect(
            ConvertCoordinateService.convertMapCoordinatesToWorldLocation({
                mapCoordinate: { q: 0, r: 0 },
            })
        ).toEqual({ x: 0, y: 0 })
        expect(
            ConvertCoordinateService.convertMapCoordinatesToWorldLocation({
                mapCoordinate: { q: 0, r: 1 },
            })
        ).toEqual({ x: HEX_TILE_WIDTH, y: 0 })
        expect(
            ConvertCoordinateService.convertMapCoordinatesToWorldLocation({
                mapCoordinate: { q: 1, r: 0 },
            })
        ).toEqual({
            x: HEX_TILE_WIDTH / 2,
            y: (3 * HEX_TILE_RADIUS) / 2,
        })
        expect(
            ConvertCoordinateService.convertMapCoordinatesToWorldLocation({
                mapCoordinate: { q: -2, r: 0 },
            })
        ).toEqual({
            x: HEX_TILE_WIDTH * -1,
            y: -3 * HEX_TILE_RADIUS,
        })
    })

    it("converts world coordinates to screen coordinates", () => {
        expect(
            ConvertCoordinateService.convertWorldLocationToScreenLocation({
                worldLocation: { x: 0, y: 0 },
                cameraLocation: { x: 0, y: 0 },
            })
        ).toEqual({
            x: ScreenDimensions.SCREEN_WIDTH / 2,
            y: ScreenDimensions.SCREEN_HEIGHT / 2,
        })

        expect(
            ConvertCoordinateService.convertWorldLocationToScreenLocation({
                worldLocation: { x: 1, y: 0 },
                cameraLocation: { x: 0, y: 0 },
            })
        ).toEqual({
            x: 1 + ScreenDimensions.SCREEN_WIDTH / 2,
            y: ScreenDimensions.SCREEN_HEIGHT / 2,
        })
        expect(
            ConvertCoordinateService.convertWorldLocationToScreenLocation({
                worldLocation: { x: 0, y: 1 },
                cameraLocation: { x: 0, y: 0 },
            })
        ).toEqual({
            x: ScreenDimensions.SCREEN_WIDTH / 2,
            y: 1 + ScreenDimensions.SCREEN_HEIGHT / 2,
        })

        expect(
            ConvertCoordinateService.convertWorldLocationToScreenLocation({
                worldLocation: { x: 0, y: 0 },
                cameraLocation: { x: 0, y: 1 },
            })
        ).toEqual({
            x: ScreenDimensions.SCREEN_WIDTH / 2,
            y: -1 + ScreenDimensions.SCREEN_HEIGHT / 2,
        })
        expect(
            ConvertCoordinateService.convertWorldLocationToScreenLocation({
                worldLocation: { x: 0, y: 1 },
                cameraLocation: { x: 0, y: 0 },
            })
        ).toEqual({
            x: ScreenDimensions.SCREEN_WIDTH / 2,
            y: 1 + ScreenDimensions.SCREEN_HEIGHT / 2,
        })
    })

    it("converts screen coordinates to world coordinates", () => {
        expect(
            ConvertCoordinateService.convertScreenLocationToWorldLocation({
                screenLocation: {
                    x: ScreenDimensions.SCREEN_WIDTH / 2,
                    y: ScreenDimensions.SCREEN_HEIGHT / 2,
                },
                cameraLocation: {
                    x: 0,
                    y: 0,
                },
            })
        ).toEqual({ x: 0, y: 0 })

        expect(
            ConvertCoordinateService.convertScreenLocationToWorldLocation({
                screenLocation: {
                    x: ScreenDimensions.SCREEN_WIDTH / 2 + 1,
                    y: ScreenDimensions.SCREEN_HEIGHT / 2,
                },
                cameraLocation: {
                    x: 0,
                    y: 0,
                },
            })
        ).toEqual({ x: 1, y: 0 })
        expect(
            ConvertCoordinateService.convertScreenLocationToWorldLocation({
                screenLocation: {
                    x: ScreenDimensions.SCREEN_WIDTH / 2,
                    y: ScreenDimensions.SCREEN_HEIGHT / 2,
                },
                cameraLocation: {
                    x: 1,
                    y: 0,
                },
            })
        ).toEqual({ x: 1, y: 0 })

        expect(
            ConvertCoordinateService.convertScreenLocationToWorldLocation({
                screenLocation: {
                    x: ScreenDimensions.SCREEN_WIDTH / 2,
                    y: ScreenDimensions.SCREEN_HEIGHT / 2 + 1,
                },
                cameraLocation: {
                    x: 0,
                    y: 0,
                },
            })
        ).toEqual({ x: 0, y: 1 })
        expect(
            ConvertCoordinateService.convertScreenLocationToWorldLocation({
                screenLocation: {
                    x: ScreenDimensions.SCREEN_WIDTH / 2,
                    y: ScreenDimensions.SCREEN_HEIGHT / 2,
                },
                cameraLocation: {
                    x: 0,
                    y: 1,
                },
            })
        ).toEqual({ x: 0, y: 1 })
    })

    it("converts map coordinates to screen coordinates", () => {
        expect(
            ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                mapCoordinate: {
                    q: 0,
                    r: 0,
                },
                cameraLocation: {
                    x: 0,
                    y: 0,
                },
            })
        ).toEqual({
            x: ScreenDimensions.SCREEN_WIDTH / 2,
            y: ScreenDimensions.SCREEN_HEIGHT / 2,
        })

        expect(
            ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                mapCoordinate: {
                    q: 0,
                    r: 1,
                },
                cameraLocation: {
                    x: 0,
                    y: 0,
                },
            })
        ).toEqual({
            x: ScreenDimensions.SCREEN_WIDTH / 2 + HEX_TILE_WIDTH,
            y: ScreenDimensions.SCREEN_HEIGHT / 2,
        })

        expect(
            ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                mapCoordinate: {
                    q: 1,
                    r: 0,
                },
                cameraLocation: {
                    x: 0,
                    y: 0,
                },
            })
        ).toEqual({
            x: ScreenDimensions.SCREEN_WIDTH / 2 + HEX_TILE_WIDTH / 2,
            y: ScreenDimensions.SCREEN_HEIGHT / 2 + (3 * HEX_TILE_RADIUS) / 2,
        })

        expect(
            ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                mapCoordinate: {
                    q: 0,
                    r: 0,
                },
                cameraLocation: {
                    x: 1,
                    y: 0,
                },
            })
        ).toEqual({
            x: ScreenDimensions.SCREEN_WIDTH / 2 - 1,
            y: ScreenDimensions.SCREEN_HEIGHT / 2,
        })
        expect(
            ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                mapCoordinate: {
                    q: 0,
                    r: 0,
                },
                cameraLocation: {
                    x: 0,
                    y: 1,
                },
            })
        ).toEqual({
            x: ScreenDimensions.SCREEN_WIDTH / 2,
            y: ScreenDimensions.SCREEN_HEIGHT / 2 - 1,
        })
    })

    it("converts screen coordinates to map coordinates", () => {
        expect(
            ConvertCoordinateService.convertScreenLocationToMapCoordinates({
                screenLocation: {
                    x: ScreenDimensions.SCREEN_WIDTH / 2,
                    y: ScreenDimensions.SCREEN_HEIGHT / 2,
                },
                cameraLocation: {
                    x: 0,
                    y: 0,
                },
            })
        ).toEqual({ q: 0, r: 0 })

        expect(
            ConvertCoordinateService.convertScreenLocationToMapCoordinates({
                screenLocation: {
                    x: ScreenDimensions.SCREEN_WIDTH / 2 + HEX_TILE_WIDTH,
                    y: ScreenDimensions.SCREEN_HEIGHT / 2,
                },
                cameraLocation: {
                    x: 0,
                    y: 0,
                },
            })
        ).toEqual({ q: 0, r: 1 })
        expect(
            ConvertCoordinateService.convertScreenLocationToMapCoordinates({
                screenLocation: {
                    x: ScreenDimensions.SCREEN_WIDTH / 2 + HEX_TILE_WIDTH / 2,
                    y:
                        ScreenDimensions.SCREEN_HEIGHT / 2 +
                        (3 * HEX_TILE_RADIUS) / 2,
                },
                cameraLocation: {
                    x: 0,
                    y: 0,
                },
            })
        ).toEqual({ q: 1, r: 0 })

        let convertedCoordinates =
            ConvertCoordinateService.convertScreenLocationToMapCoordinates({
                screenLocation: {
                    x: ScreenDimensions.SCREEN_WIDTH / 2,
                    y: ScreenDimensions.SCREEN_HEIGHT / 2,
                },
                cameraLocation: {
                    x: HEX_TILE_WIDTH * -1,
                    y: 0,
                },
            })
        expect(convertedCoordinates.q).toBeCloseTo(0)
        expect(convertedCoordinates.r).toBeCloseTo(-1)

        convertedCoordinates =
            ConvertCoordinateService.convertScreenLocationToMapCoordinates({
                screenLocation: {
                    x: ScreenDimensions.SCREEN_WIDTH / 2,
                    y: ScreenDimensions.SCREEN_HEIGHT / 2,
                },
                cameraLocation: {
                    x: HEX_TILE_WIDTH / 2,
                    y: (3 * HEX_TILE_RADIUS) / 2,
                },
            })
        expect(convertedCoordinates.q).toBeCloseTo(1)
        expect(convertedCoordinates.r).toBeCloseTo(-0)
    })
})
