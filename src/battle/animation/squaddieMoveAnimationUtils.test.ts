import { getSquaddiePositionAlongPath } from "./squaddieMoveAnimationUtils"
import { BattleCamera } from "../battleCamera"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"
import { ConvertCoordinateService } from "../../hexMap/convertCoordinates"
import { beforeEach, describe, expect, it } from "vitest"

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
            ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                mapCoordinate: {
                    q: movementPath[0].q,
                    r: movementPath[0].r,
                },
                cameraLocation: camera.getWorldLocation(),
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
            ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                mapCoordinate: {
                    q: movementPath[0].q,
                    r: movementPath[0].r,
                },
                cameraLocation: camera.getWorldLocation(),
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
            ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                mapCoordinate: {
                    q: movementPath[0].q,
                    r: movementPath[0].r,
                },
                cameraLocation: camera.getWorldLocation(),
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
            ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                mapCoordinate: {
                    q: movementPath[movementPath.length - 1].q,
                    r: movementPath[movementPath.length - 1].r,
                },
                cameraLocation: camera.getWorldLocation(),
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
            ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                mapCoordinate: {
                    q: movementPath[1].q,
                    r: movementPath[1].r,
                },
                cameraLocation: camera.getWorldLocation(),
            })
        const tile2Coords =
            ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                mapCoordinate: {
                    q: movementPath[2].q,
                    r: movementPath[2].r,
                },
                cameraLocation: camera.getWorldLocation(),
            })

        expect(startLocation).toEqual({
            x: (tile1Coords.x + tile2Coords.x) / 2.0,
            y: (tile1Coords.y + tile2Coords.y) / 2.0,
        })
    })
})
