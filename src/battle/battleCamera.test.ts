import { BattleCamera } from "./battleCamera"
import { HEX_TILE_WIDTH } from "../graphicsConstants"
import { ConvertCoordinateService } from "../hexMap/convertCoordinates"
import { ScreenDimensions } from "../utils/graphics/graphicsConfig"
import { describe, expect, it, vi } from "vitest"

describe("BattleCamera", () => {
    it("can be constrained so it cannot scroll too high up", () => {
        const camera: BattleCamera = new BattleCamera(
            0,
            -ScreenDimensions.SCREEN_HEIGHT
        )
        const numberOfRowsThatCanFitOnScreen = Math.trunc(
            ScreenDimensions.SCREEN_HEIGHT / HEX_TILE_WIDTH
        )
        camera.setYVelocity(100)
        camera.setMapDimensionBoundaries(1, numberOfRowsThatCanFitOnScreen + 5)

        camera.constrainCamera()

        expect(camera.getWorldLocation().y).toBeGreaterThanOrEqual(
            0 -
                ScreenDimensions.SCREEN_HEIGHT / 10 +
                ScreenDimensions.SCREEN_HEIGHT / 2
        )
        expect(camera.getVelocity().yVelocity).toBe(0)
    })

    it("can be constrained so it cannot scroll too far down", () => {
        const camera: BattleCamera = new BattleCamera(
            0,
            2 * ScreenDimensions.SCREEN_HEIGHT
        )
        const numberOfRowsThatCanFitOnScreen = Math.trunc(
            ScreenDimensions.SCREEN_HEIGHT / HEX_TILE_WIDTH
        )
        camera.setYVelocity(-100)
        camera.setMapDimensionBoundaries(1, numberOfRowsThatCanFitOnScreen + 5)

        camera.constrainCamera()

        expect(camera.getWorldLocation().y).toBeLessThanOrEqual(
            (numberOfRowsThatCanFitOnScreen + 5) * HEX_TILE_WIDTH -
                ScreenDimensions.SCREEN_HEIGHT / 2 +
                ScreenDimensions.SCREEN_HEIGHT / 10
        )
        expect(camera.getVelocity().yVelocity).toBe(0)
    })

    it("no vertical scrolling if the map has only a few rows", () => {
        const camera: BattleCamera = new BattleCamera(
            0,
            2 * ScreenDimensions.SCREEN_HEIGHT
        )
        camera.setYVelocity(-100)
        camera.setMapDimensionBoundaries(3, 3)

        camera.constrainCamera()

        const bottomOfLastRow: number =
            ConvertCoordinateService.convertMapCoordinatesToWorldLocation({
                mapCoordinate: { q: 3, r: 0 },
            }).y

        expect(camera.getWorldLocation().y).toBe(bottomOfLastRow / 2)
        expect(camera.getVelocity().yVelocity).toBe(0)
    })

    it("no horizontal scrolling if the map has only a few columns", () => {
        const camera: BattleCamera = new BattleCamera(
            2 * ScreenDimensions.SCREEN_WIDTH,
            0
        )
        camera.setXVelocity(-100)
        camera.setMapDimensionBoundaries(3, 3)

        camera.constrainCamera()

        const topLeftTile =
            ConvertCoordinateService.convertMapCoordinatesToWorldLocation({
                mapCoordinate: { q: 0, r: 0 },
            })
        const bottomRightTile =
            ConvertCoordinateService.convertMapCoordinatesToWorldLocation({
                mapCoordinate: { q: 3, r: 3 },
            })

        expect(camera.getWorldLocation().x).toBe(
            (topLeftTile.x + bottomRightTile.x) / 2
        )
        expect(camera.getVelocity().xVelocity).toBe(0)
    })

    it("can be constrained so it cannot scroll too far to the left", () => {
        const worldLocationOfBoundary =
            ConvertCoordinateService.convertMapCoordinatesToWorldLocation({
                mapCoordinate: { q: 2, r: 0 },
            })
        const camera: BattleCamera = new BattleCamera(
            -ScreenDimensions.SCREEN_WIDTH * 2,
            worldLocationOfBoundary.y
        )
        camera.setXVelocity(100)
        camera.setMapDimensionBoundaries(2, 5)

        camera.constrainCamera()

        expect(camera.getWorldLocation().x).toBeGreaterThanOrEqual(
            worldLocationOfBoundary.x - ScreenDimensions.SCREEN_WIDTH / 10
        )
        expect(camera.getVelocity().xVelocity).toBe(0)
    })

    it("can be constrained so it cannot scroll too far to the right", () => {
        const worldLocationOfBoundary =
            ConvertCoordinateService.convertMapCoordinatesToWorldLocation({
                mapCoordinate: { q: 2, r: 2 },
            })
        const camera: BattleCamera = new BattleCamera(
            ScreenDimensions.SCREEN_WIDTH * 2,
            worldLocationOfBoundary.y
        )
        camera.setXVelocity(100)
        camera.setMapDimensionBoundaries(2, 5)

        camera.constrainCamera()

        expect(camera.getWorldLocation().x).toBeLessThanOrEqual(
            worldLocationOfBoundary.x + ScreenDimensions.SCREEN_WIDTH / 10
        )
        expect(camera.getVelocity().xVelocity).toBe(0)
    })

    describe("camera pan", () => {
        it("can pan over to a coordinate", () => {
            vi.spyOn(Date, "now").mockImplementation(() => 0)
            const initialCoordinates: number[] = [
                0,
                -ScreenDimensions.SCREEN_HEIGHT,
            ]
            const destinationCoordinates: number[] = [
                100,
                -ScreenDimensions.SCREEN_HEIGHT + 200,
            ]
            const timeToPan: number = 1000

            const camera: BattleCamera = new BattleCamera(...initialCoordinates)

            camera.pan({
                xDestination: destinationCoordinates[0],
                yDestination: destinationCoordinates[1],
                timeToPan,
                respectConstraints: false,
            })
            camera.moveCamera()
            expect(camera.isPanning()).toBeTruthy()
            expect(camera.getPanningInformation()).toStrictEqual({
                xStartCoordinate: initialCoordinates[0],
                yStartCoordinate: initialCoordinates[1],
                xDestination: destinationCoordinates[0],
                yDestination: destinationCoordinates[1],
                timeToPan,
                panStartTime: 0,
                respectConstraints: false,
            })
            expect(camera.getWorldLocation()).toEqual({
                x: initialCoordinates[0],
                y: initialCoordinates[1],
            })

            vi.spyOn(Date, "now").mockImplementation(() => timeToPan / 2)
            camera.moveCamera()
            expect(camera.getWorldLocation().x).toBeCloseTo(
                (initialCoordinates[0] + destinationCoordinates[0]) / 2
            )
            expect(camera.getWorldLocation().y).toBeCloseTo(
                (initialCoordinates[1] + destinationCoordinates[1]) / 2
            )

            vi.spyOn(Date, "now").mockImplementation(() => timeToPan)
            camera.moveCamera()
            expect(camera.getWorldLocation()).toEqual({
                x: destinationCoordinates[0],
                y: destinationCoordinates[1],
            })

            expect(camera.isPanning()).toBeFalsy()
            expect(camera.getPanningInformation()).toBeUndefined()
        })
        it("will instantly pan over if timeToPan is not positive", () => {
            const initialCoordinates: number[] = [
                0,
                -ScreenDimensions.SCREEN_HEIGHT,
            ]
            const destinationCoordinates: number[] = [
                100,
                -ScreenDimensions.SCREEN_HEIGHT + 200,
            ]

            const camera: BattleCamera = new BattleCamera(...initialCoordinates)

            camera.pan({
                xDestination: destinationCoordinates[0],
                yDestination: destinationCoordinates[1],
                timeToPan: 0,
                respectConstraints: false,
            })
            camera.moveCamera()
            expect(camera.getWorldLocation()).toEqual({
                x: destinationCoordinates[0],
                y: destinationCoordinates[1],
            })
            expect(camera.isPanning()).toBeFalsy()
            expect(camera.getPanningInformation()).toBeUndefined()
        })
        it("will instantly cut over", () => {
            const initialCoordinates: number[] = [
                0,
                -ScreenDimensions.SCREEN_HEIGHT,
            ]
            const destinationCoordinates: number[] = [
                100,
                -ScreenDimensions.SCREEN_HEIGHT + 200,
            ]

            const camera: BattleCamera = new BattleCamera(...initialCoordinates)

            camera.cut({
                xDestination: destinationCoordinates[0],
                yDestination: destinationCoordinates[1],
                respectConstraints: false,
            })
            camera.moveCamera()
            expect(camera.getWorldLocation()).toEqual({
                x: destinationCoordinates[0],
                y: destinationCoordinates[1],
            })
        })
        it("can pan over to a coordinate, respecting constraints", () => {
            vi.spyOn(Date, "now").mockImplementation(() => 0)
            const initialCoordinates: number[] = [
                0,
                -ScreenDimensions.SCREEN_HEIGHT,
            ]
            const verticalTopLimit: number =
                0 -
                ScreenDimensions.SCREEN_HEIGHT / 10 +
                ScreenDimensions.SCREEN_HEIGHT / 2
            const destinationCoordinates: number[] = [
                0,
                verticalTopLimit - ScreenDimensions.SCREEN_HEIGHT,
            ]
            const timeToPan: number = 1000

            const camera: BattleCamera = new BattleCamera(...initialCoordinates)

            camera.pan({
                xDestination: destinationCoordinates[0],
                yDestination: destinationCoordinates[1],
                timeToPan,
                respectConstraints: true,
            })
            expect(camera.getWorldLocation().y).toBe(initialCoordinates[1])

            camera.moveCamera()
            expect(camera.getWorldLocation().y).toBeCloseTo(verticalTopLimit)
            expect(camera.isPanning()).toBeTruthy()

            vi.spyOn(Date, "now").mockImplementation(() => timeToPan / 2)
            camera.moveCamera()
            expect(camera.getWorldLocation().y).toBeCloseTo(verticalTopLimit)
            expect(camera.isPanning()).toBeTruthy()

            vi.spyOn(Date, "now").mockImplementation(() => timeToPan)
            camera.moveCamera()
            expect(camera.getWorldLocation().y).toBeCloseTo(verticalTopLimit)
            expect(camera.isPanning()).toBeFalsy()
        })
        it("can pan over to a coordinate, ignoring constraints", () => {
            vi.spyOn(Date, "now").mockImplementation(() => 0)
            const initialCoordinates: number[] = [
                0,
                -ScreenDimensions.SCREEN_HEIGHT,
            ]
            const verticalTopLimit: number =
                0 -
                ScreenDimensions.SCREEN_HEIGHT / 10 +
                ScreenDimensions.SCREEN_HEIGHT / 2
            const destinationCoordinates: number[] = [
                0,
                verticalTopLimit - ScreenDimensions.SCREEN_HEIGHT,
            ]
            const timeToPan: number = 1000

            const camera: BattleCamera = new BattleCamera(...initialCoordinates)

            camera.pan({
                xDestination: destinationCoordinates[0],
                yDestination: destinationCoordinates[1],
                timeToPan,
                respectConstraints: false,
            })
            expect(camera.getWorldLocation().y).toBe(initialCoordinates[1])

            camera.moveCamera()
            expect(camera.getWorldLocation().y).toBe(initialCoordinates[1])
            expect(camera.isPanning()).toBeTruthy()

            vi.spyOn(Date, "now").mockImplementation(() => timeToPan)
            camera.moveCamera()
            expect(camera.getWorldLocation().y).toBeCloseTo(
                destinationCoordinates[1]
            )
            expect(camera.isPanning()).toBeFalsy()
        })
    })
})
