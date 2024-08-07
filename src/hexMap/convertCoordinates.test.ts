import {
    ConvertCoordinateService,
    convertMapCoordinatesToScreenCoordinates,
    convertScreenCoordinatesToMapCoordinates,
    convertScreenCoordinatesToWorldCoordinates,
    convertWorldCoordinatesToMapCoordinates,
    convertWorldCoordinatesToScreenCoordinates,
} from "./convertCoordinates"
import { HEX_TILE_WIDTH } from "../graphicsConstants"
import { ScreenDimensions } from "../utils/graphics/graphicsConfig"

describe("convertCoordinates", () => {
    it("converts world coordinates to map coordinates", () => {
        expect(convertWorldCoordinatesToMapCoordinates(0, 0)).toStrictEqual([
            0, 0,
        ])
        expect(
            convertWorldCoordinatesToMapCoordinates(HEX_TILE_WIDTH, 0)
        ).toStrictEqual([0, 1])
        expect(
            convertWorldCoordinatesToMapCoordinates(
                HEX_TILE_WIDTH / 2 + 1,
                (HEX_TILE_WIDTH * Math.sqrt(3)) / 2 + 1
            )
        ).toStrictEqual([1, 0])
        expect(
            convertWorldCoordinatesToMapCoordinates(
                HEX_TILE_WIDTH * -1,
                HEX_TILE_WIDTH * -1 * Math.sqrt(3) + 1
            )
        ).toStrictEqual([-2, -0])
    })

    it("converts map coordinates to world coordinates", () => {
        expect(
            ConvertCoordinateService.convertMapCoordinatesToWorldCoordinates(
                0,
                0
            )
        ).toStrictEqual([0, 0])
        expect(
            ConvertCoordinateService.convertMapCoordinatesToWorldCoordinates(
                0,
                1
            )
        ).toStrictEqual([HEX_TILE_WIDTH, 0])
        expect(
            ConvertCoordinateService.convertMapCoordinatesToWorldCoordinates(
                1,
                0
            )
        ).toStrictEqual([
            HEX_TILE_WIDTH / 2,
            (HEX_TILE_WIDTH * Math.sqrt(3)) / 2,
        ])
        expect(
            ConvertCoordinateService.convertMapCoordinatesToWorldCoordinates(
                -2,
                0
            )
        ).toStrictEqual([
            HEX_TILE_WIDTH * -1,
            HEX_TILE_WIDTH * -1 * Math.sqrt(3),
        ])
    })

    it("converts world coordinates to screen coordinates", () => {
        expect(
            convertWorldCoordinatesToScreenCoordinates(0, 0, 0, 0)
        ).toStrictEqual([
            0 + ScreenDimensions.SCREEN_WIDTH / 2,
            0 + ScreenDimensions.SCREEN_HEIGHT / 2,
        ])

        expect(
            convertWorldCoordinatesToScreenCoordinates(1, 0, 0, 0)
        ).toStrictEqual([
            1 + ScreenDimensions.SCREEN_WIDTH / 2,
            0 + ScreenDimensions.SCREEN_HEIGHT / 2,
        ])
        expect(
            convertWorldCoordinatesToScreenCoordinates(0, 1, 0, 0)
        ).toStrictEqual([
            0 + ScreenDimensions.SCREEN_WIDTH / 2,
            1 + ScreenDimensions.SCREEN_HEIGHT / 2,
        ])

        expect(
            convertWorldCoordinatesToScreenCoordinates(0, 0, 0, 1)
        ).toStrictEqual([
            0 + ScreenDimensions.SCREEN_WIDTH / 2,
            -1 + ScreenDimensions.SCREEN_HEIGHT / 2,
        ])
        expect(
            convertWorldCoordinatesToScreenCoordinates(0, 1, 0, 0)
        ).toStrictEqual([
            0 + ScreenDimensions.SCREEN_WIDTH / 2,
            1 + ScreenDimensions.SCREEN_HEIGHT / 2,
        ])
    })

    it("converts screen coordinates to world coordinates", () => {
        expect(
            convertScreenCoordinatesToWorldCoordinates(
                ScreenDimensions.SCREEN_WIDTH / 2,
                ScreenDimensions.SCREEN_HEIGHT / 2,
                0,
                0
            )
        ).toStrictEqual([0, 0])

        expect(
            convertScreenCoordinatesToWorldCoordinates(
                ScreenDimensions.SCREEN_WIDTH / 2 + 1,
                ScreenDimensions.SCREEN_HEIGHT / 2,
                0,
                0
            )
        ).toStrictEqual([1, 0])
        expect(
            convertScreenCoordinatesToWorldCoordinates(
                ScreenDimensions.SCREEN_WIDTH / 2,
                ScreenDimensions.SCREEN_HEIGHT / 2,
                1,
                0
            )
        ).toStrictEqual([1, 0])

        expect(
            convertScreenCoordinatesToWorldCoordinates(
                ScreenDimensions.SCREEN_WIDTH / 2,
                ScreenDimensions.SCREEN_HEIGHT / 2 + 1,
                0,
                0
            )
        ).toStrictEqual([0, 1])
        expect(
            convertScreenCoordinatesToWorldCoordinates(
                ScreenDimensions.SCREEN_WIDTH / 2,
                ScreenDimensions.SCREEN_HEIGHT / 2,
                0,
                1
            )
        ).toStrictEqual([0, 1])
    })

    it("converts map coordinates to screen coordinates", () => {
        expect(
            ConvertCoordinateService.convertMapCoordinatesToScreenCoordinates({
                q: 0,
                r: 0,
                cameraX: 0,
                cameraY: 0,
            })
        ).toStrictEqual({
            x: ScreenDimensions.SCREEN_WIDTH / 2,
            y: ScreenDimensions.SCREEN_HEIGHT / 2,
        })

        expect(
            convertMapCoordinatesToScreenCoordinates(0, 1, 0, 0)
        ).toStrictEqual([
            ScreenDimensions.SCREEN_WIDTH / 2 + HEX_TILE_WIDTH,
            ScreenDimensions.SCREEN_HEIGHT / 2,
        ])

        expect(
            convertMapCoordinatesToScreenCoordinates(1, 0, 0, 0)
        ).toStrictEqual([
            ScreenDimensions.SCREEN_WIDTH / 2 + HEX_TILE_WIDTH / 2,
            ScreenDimensions.SCREEN_HEIGHT / 2 +
                (HEX_TILE_WIDTH * Math.sqrt(3)) / 2,
        ])

        expect(
            convertMapCoordinatesToScreenCoordinates(0, 0, 1, 0)
        ).toStrictEqual([
            ScreenDimensions.SCREEN_WIDTH / 2 - 1,
            ScreenDimensions.SCREEN_HEIGHT / 2,
        ])
        expect(
            convertMapCoordinatesToScreenCoordinates(0, 0, 0, 1)
        ).toStrictEqual([
            ScreenDimensions.SCREEN_WIDTH / 2,
            ScreenDimensions.SCREEN_HEIGHT / 2 - 1,
        ])
    })

    it("converts screen coordinates to map coordinates", () => {
        expect(
            ConvertCoordinateService.convertScreenCoordinatesToMapCoordinates({
                screenX: ScreenDimensions.SCREEN_WIDTH / 2,
                screenY: ScreenDimensions.SCREEN_HEIGHT / 2,
                cameraX: 0,
                cameraY: 0,
            })
        ).toStrictEqual({ q: 0, r: 0 })

        expect(
            convertScreenCoordinatesToMapCoordinates(
                ScreenDimensions.SCREEN_WIDTH / 2 + HEX_TILE_WIDTH,
                ScreenDimensions.SCREEN_HEIGHT / 2,
                0,
                0
            )
        ).toStrictEqual([0, 1])
        expect(
            convertScreenCoordinatesToMapCoordinates(
                ScreenDimensions.SCREEN_WIDTH / 2 + HEX_TILE_WIDTH / 2,
                ScreenDimensions.SCREEN_HEIGHT / 2 +
                    (HEX_TILE_WIDTH * Math.sqrt(3)) / 2,
                0,
                0
            )
        ).toStrictEqual([1, -0])

        expect(
            convertScreenCoordinatesToMapCoordinates(
                ScreenDimensions.SCREEN_WIDTH / 2,
                ScreenDimensions.SCREEN_HEIGHT / 2,
                HEX_TILE_WIDTH * -1,
                0
            )
        ).toStrictEqual([0, -1])
        expect(
            convertScreenCoordinatesToMapCoordinates(
                ScreenDimensions.SCREEN_WIDTH / 2,
                ScreenDimensions.SCREEN_HEIGHT / 2,
                HEX_TILE_WIDTH / 2,
                (HEX_TILE_WIDTH * Math.sqrt(3)) / 2
            )
        ).toStrictEqual([1, -0])
    })
})
