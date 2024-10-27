import {
    getSquaddiePositionAlongPath,
    lerpSquaddieBetweenPath,
} from "./squaddieMoveAnimationUtils"
import { HEX_TILE_WIDTH } from "../../graphicsConstants"
import { BattleCamera } from "../battleCamera"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"
import { ConvertCoordinateService } from "../../hexMap/convertCoordinates"

describe("lerpSquaddieBetweenPath", () => {
    it("lerp between two points on a map", () => {
        const movementPathInfo: HexCoordinate[] = [
            { q: 0, r: 0 },
            { q: 0, r: 1 },
        ]

        const startLocation = lerpSquaddieBetweenPath(
            movementPathInfo,
            0,
            1000,
            0,
            0
        )
        expect(startLocation).toEqual({
            screenX: ScreenDimensions.SCREEN_WIDTH / 2,
            screenY: ScreenDimensions.SCREEN_HEIGHT / 2,
        })

        const midLocation = lerpSquaddieBetweenPath(
            movementPathInfo,
            500,
            1000,
            0,
            0
        )
        expect(midLocation).toEqual({
            screenX: ScreenDimensions.SCREEN_WIDTH / 2 + HEX_TILE_WIDTH / 2,
            screenY: ScreenDimensions.SCREEN_HEIGHT / 2,
        })

        const endLocation = lerpSquaddieBetweenPath(
            movementPathInfo,
            1000,
            1000,
            0,
            0
        )
        expect(endLocation).toEqual({
            screenX: ScreenDimensions.SCREEN_WIDTH / 2 + HEX_TILE_WIDTH,
            screenY: ScreenDimensions.SCREEN_HEIGHT / 2,
        })
    })
})

describe("getSquaddiePositionAlongPath", () => {
    let movementPath: HexCoordinate[]
    let camera: BattleCamera

    beforeEach(() => {
        movementPath = [
            { q: 0, r: 0 },
            { q: 0, r: 1 },
            { q: 1, r: 1 },
        ]

        camera = new BattleCamera()
    })

    it("starts at the start point", () => {
        const startLocation = getSquaddiePositionAlongPath(
            movementPath,
            0,
            1000,
            camera
        )
        expect(startLocation).toStrictEqual(
            ConvertCoordinateService.convertMapCoordinatesToScreenCoordinates({
                q: movementPath[0].q,
                r: movementPath[0].r,
                ...camera.getCoordinates(),
            })
        )
    })
    it("ends at the end point", () => {
        const startLocation = getSquaddiePositionAlongPath(
            movementPath,
            1000,
            1000,
            camera
        )
        expect(startLocation).toStrictEqual(
            ConvertCoordinateService.convertMapCoordinatesToScreenCoordinates({
                q: movementPath[0].q,
                r: movementPath[0].r,
                ...camera.getCoordinates(),
            })
        )
    })
    it("if time is before, maps to start point", () => {
        const startLocation = getSquaddiePositionAlongPath(
            movementPath,
            -100,
            1000,
            camera
        )
        expect(startLocation).toStrictEqual(
            ConvertCoordinateService.convertMapCoordinatesToScreenCoordinates({
                q: movementPath[0].q,
                r: movementPath[0].r,
                ...camera.getCoordinates(),
            })
        )
    })

    it("if time is after, maps to end point", () => {
        const startLocation = getSquaddiePositionAlongPath(
            movementPath,
            1100,
            1000,
            camera
        )
        expect(startLocation).toStrictEqual(
            ConvertCoordinateService.convertMapCoordinatesToScreenCoordinates({
                q: movementPath[movementPath.length - 1].q,
                r: movementPath[movementPath.length - 1].r,
                ...camera.getCoordinates(),
            })
        )
    })

    it("maps to midway point when halfway done", () => {
        const startLocation = getSquaddiePositionAlongPath(
            movementPath,
            500,
            1000,
            camera
        )
        const tile1Coords =
            ConvertCoordinateService.convertMapCoordinatesToScreenCoordinates({
                q: movementPath[1].q,
                r: movementPath[1].r,
                ...camera.getCoordinates(),
            })
        const tile2Coords =
            ConvertCoordinateService.convertMapCoordinatesToScreenCoordinates({
                q: movementPath[2].q,
                r: movementPath[2].r,
                ...camera.getCoordinates(),
            })

        expect(startLocation).toEqual({
            screenX: (tile1Coords.screenX + tile2Coords.screenX) / 2.0,
            screenY: (tile1Coords.screenY + tile2Coords.screenY) / 2.0,
        })
    })
})
