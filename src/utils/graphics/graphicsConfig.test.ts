import { GraphicsConfig, ScreenDimensions } from "./graphicsConfig"
import { beforeEach, describe, expect, it } from "vitest"
import { BattleCamera } from "../../battle/battleCamera"
import { HEX_TILE_HEIGHT, HEX_TILE_WIDTH } from "../../graphicsConstants"
import { ConvertCoordinateService } from "../../hexMap/convertCoordinates"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"

describe("graphics config", () => {
    describe("isLocationOnScreen", () => {
        const locationTests = [
            {
                expected: true,
                x: 0,
                y: 0,
            },
            {
                expected: true,
                x: ScreenDimensions.SCREEN_WIDTH - 1,
                y: 0,
            },
            {
                expected: true,
                x: 0,
                y: ScreenDimensions.SCREEN_HEIGHT - 1,
            },
            {
                expected: true,
                x: ScreenDimensions.SCREEN_WIDTH - 1,
                y: ScreenDimensions.SCREEN_HEIGHT - 1,
            },
            {
                expected: false,
                x: -1,
                y: 0,
            },
            {
                expected: false,
                x: 0,
                y: -1,
            },
            {
                expected: false,
                x: ScreenDimensions.SCREEN_WIDTH,
                y: 0,
            },
            {
                expected: false,
                x: 0,
                y: ScreenDimensions.SCREEN_HEIGHT,
            },
        ]

        it.each(locationTests)(
            `isLocationOnScreen test is $expected coordinates ($x, $y) `,
            ({ expected, x, y }) => {
                expect(GraphicsConfig.isLocationOnScreen(x, y)).toEqual(
                    expected
                )
            }
        )
    })
    describe("isLocationWithinMiddleThirdOfScreen", () => {
        const locationTests = [
            {
                expected: true,
                x: ScreenDimensions.SCREEN_WIDTH * 0.5,
                y: ScreenDimensions.SCREEN_HEIGHT * 0.5,
            },
            {
                expected: false,
                x: ScreenDimensions.SCREEN_WIDTH * 0.3,
                y: ScreenDimensions.SCREEN_HEIGHT * 0.5,
            },
            {
                expected: false,
                x: ScreenDimensions.SCREEN_WIDTH * 0.7,
                y: ScreenDimensions.SCREEN_HEIGHT * 0.5,
            },
            {
                expected: false,
                x: ScreenDimensions.SCREEN_WIDTH * 0.5,
                y: ScreenDimensions.SCREEN_HEIGHT * 0.3,
            },
            {
                expected: false,
                x: ScreenDimensions.SCREEN_WIDTH * 0.5,
                y: ScreenDimensions.SCREEN_HEIGHT * 0.7,
            },
            {
                expected: false,
                x: ScreenDimensions.SCREEN_WIDTH * 0.3,
                y: ScreenDimensions.SCREEN_HEIGHT * 0.3,
            },
            {
                expected: false,
                x: ScreenDimensions.SCREEN_WIDTH * 0.3,
                y: ScreenDimensions.SCREEN_HEIGHT * 0.7,
            },
            {
                expected: false,
                x: ScreenDimensions.SCREEN_WIDTH * 0.7,
                y: ScreenDimensions.SCREEN_HEIGHT * 0.7,
            },
            {
                expected: false,
                x: ScreenDimensions.SCREEN_WIDTH * 0.3,
                y: ScreenDimensions.SCREEN_HEIGHT * 0.7,
            },
        ]

        it.each(locationTests)(
            `isLocationWithinMiddleThirdOfScreen test is $expected coordinates ($x, $y) `,
            ({ expected, x, y }) => {
                expect(
                    GraphicsConfig.isLocationWithinMiddleThirdOfScreen(x, y)
                ).toEqual(expected)
            }
        )
    })
    describe("isMapCoordinateOnScreen", () => {
        let camera: BattleCamera
        const numberOfHorizontalTilesOnScreen =
            ScreenDimensions.SCREEN_WIDTH / HEX_TILE_WIDTH
        const numberOfVerticalTilesOnScreen =
            ScreenDimensions.SCREEN_HEIGHT / HEX_TILE_HEIGHT

        beforeEach(() => {
            const initialCameraPosition =
                ConvertCoordinateService.convertMapCoordinatesToWorldLocation({
                    mapCoordinate: {
                        q: 0,
                        r: 0,
                    },
                })
            camera = new BattleCamera(
                initialCameraPosition.x,
                initialCameraPosition.y
            )
        })

        const coordinateTests = [
            {
                name: "is on screen if it is under the camera",
                mapCoordinate: (): HexCoordinate => ({ q: 0, r: 0 }),
                expected: true,
            },
            {
                name: "is off screen if it is vertically off screen",
                mapCoordinate: (): HexCoordinate => ({
                    q: Math.floor(numberOfVerticalTilesOnScreen) - 1,
                    r: 0,
                }),
                expected: false,
            },
            {
                name: "is off screen if it is horizontally off screen",
                mapCoordinate: (): HexCoordinate => ({
                    q: 0,
                    r: Math.floor(numberOfHorizontalTilesOnScreen) - 1,
                }),
                expected: false,
            },
            {
                name: "is off screen if it is vertically off screen",
                mapCoordinate: (): HexCoordinate | undefined => undefined,
                expected: false,
            },
        ]

        it.each(coordinateTests)(`$name`, ({ mapCoordinate, expected }) => {
            expect(
                GraphicsConfig.isMapCoordinateOnScreen({
                    mapCoordinate: mapCoordinate(),
                    camera,
                })
            ).toBe(expected)
        })
    })
})
