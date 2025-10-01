import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import { HexCoordinate } from "../../../hexMap/hexCoordinate/hexCoordinate"
import { BattleCamera } from "../../battleCamera"
import {
    SquaddieMoveOnMapAnimation,
    SquaddieMoveOnMapAnimationService,
} from "./squaddieMoveOnMapAnimation"
import { ConvertCoordinateService } from "../../../hexMap/convertCoordinates"
import { ScreenLocation } from "../../../utils/mouseConfig"

describe("SquaddieMoveOnMapAnimation", () => {
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

    describe("can create a squaddie map movement state", () => {
        let dateSpy: MockInstance
        beforeEach(() => {
            dateSpy = vi.spyOn(Date, "now").mockReturnValue(0)
        })

        afterEach(() => {
            if (dateSpy) {
                dateSpy.mockRestore()
            }
        })

        it("throws an error if camera is undefined", () => {
            expect(() => {
                SquaddieMoveOnMapAnimationService.new({
                    //@ts-ignore Intentionally using a bad argument to throw an exception
                    camera: undefined,
                    movementPath,
                })
            }).toThrow("camera must be defined")
        })

        it("throws an error if movementPath is undefined", () => {
            expect(() => {
                SquaddieMoveOnMapAnimationService.new({
                    camera,
                    //@ts-ignore Intentionally using a bad argument to throw an exception
                    movementPath: undefined,
                })
            }).toThrow("movementPath must be defined")
        })

        it("throws an error if movementPath is empty", () => {
            expect(() => {
                SquaddieMoveOnMapAnimationService.new({
                    camera,
                    movementPath: [],
                })
            }).toThrow("movementPath must not be empty")
        })
    })
    describe("tracks movement over time", () => {
        let dateSpy: MockInstance
        beforeEach(() => {
            dateSpy = vi.spyOn(Date, "now").mockReturnValue(0)
        })

        afterEach(() => {
            if (dateSpy) {
                dateSpy.mockRestore()
            }
        })

        it("will not start until the first update call", () => {
            const animation = SquaddieMoveOnMapAnimationService.new({
                camera,
                movementPath,
            })

            expect(
                SquaddieMoveOnMapAnimationService.hasStartedMoving(animation)
            ).toBe(false)
            SquaddieMoveOnMapAnimationService.update(animation)
            expect(
                SquaddieMoveOnMapAnimationService.hasStartedMoving(animation)
            ).toBe(true)
            expect(animation.startAnimationTime).not.toBeUndefined()
        })

        it("will be finished after the animation time completes", () => {
            const animation = SquaddieMoveOnMapAnimationService.new({
                camera,
                movementPath,
            })
            SquaddieMoveOnMapAnimationService.update(animation)
            expect(
                SquaddieMoveOnMapAnimationService.hasFinishedMoving(animation)
            ).toBe(false)
            expect(animation.startAnimationTime).not.toBeUndefined()

            dateSpy = vi
                .spyOn(Date, "now")
                .mockReturnValue(
                    animation.startAnimationTime! + animation.animationDuration
                )
            expect(
                SquaddieMoveOnMapAnimationService.hasFinishedMoving(animation)
            ).toBe(true)
        })

        it("will be at the first coordinate if you get the location before starting", () => {
            const expectedCoordinate =
                ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                    mapCoordinate: movementPath[0],
                    cameraLocation: camera.getWorldLocation(),
                })
            const animation = SquaddieMoveOnMapAnimationService.new({
                camera,
                movementPath,
            })

            const actualCoordinate =
                SquaddieMoveOnMapAnimationService.getScreenSquaddieScreenLocation(
                    animation
                )

            expect(actualCoordinate.x).toEqual(expectedCoordinate.x)
            expect(actualCoordinate.y).toEqual(expectedCoordinate.y)
        })

        it("will be at the last coordinate if you get the location after the animation finishes", () => {
            const expectedCoordinate =
                ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                    mapCoordinate: movementPath[movementPath.length - 1],
                    cameraLocation: camera.getWorldLocation(),
                })
            const animation = SquaddieMoveOnMapAnimationService.new({
                camera,
                movementPath,
            })
            expect(
                expectToDrawSquaddieAtExpectedCoordinate({
                    animation: animation,
                    dateSpy: dateSpy,
                    expectedCoordinate: expectedCoordinate,
                    duration: animation.animationDuration + 100,
                })
            ).toBeTruthy()
        })

        it("will be at the last coordinate if the path only has 1 coordinate", () => {
            const expectedCoordinate =
                ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                    mapCoordinate: movementPath[0],
                    cameraLocation: camera.getWorldLocation(),
                })
            const animation = SquaddieMoveOnMapAnimationService.new({
                camera,
                movementPath: [movementPath[0]],
            })
            expect(
                expectToDrawSquaddieAtExpectedCoordinate({
                    animation: animation,
                    dateSpy: dateSpy,
                    expectedCoordinate: expectedCoordinate,
                    duration: animation.animationDuration,
                })
            ).toBeTruthy()
        })

        it("will be between coordinates over time", () => {
            const qMovementPath = [
                { q: 0, r: 0 },
                { q: 1, r: 0 },
            ]
            const screenLocation0 =
                ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                    mapCoordinate: qMovementPath[0],
                    cameraLocation: camera.getWorldLocation(),
                })
            const screenLocation1 =
                ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                    mapCoordinate: qMovementPath[1],
                    cameraLocation: camera.getWorldLocation(),
                })

            const animation = SquaddieMoveOnMapAnimationService.new({
                camera,
                movementPath: qMovementPath,
            })

            SquaddieMoveOnMapAnimationService.update(animation)
            dateSpy.mockReturnValue(animation.animationDuration * 0.2)
            SquaddieMoveOnMapAnimationService.update(animation)

            const actualCoordinate =
                SquaddieMoveOnMapAnimationService.getScreenSquaddieScreenLocation(
                    animation
                )

            expect(actualCoordinate.x).toBeGreaterThan(screenLocation0.x)
            expect(actualCoordinate.y).toBeGreaterThan(screenLocation0.y)

            expect(actualCoordinate.x).toBeLessThan(screenLocation1.x)
            expect(actualCoordinate.y).toBeLessThan(screenLocation1.y)
        })
    })
})

const expectToDrawSquaddieAtExpectedCoordinate = ({
    animation,
    dateSpy,
    expectedCoordinate,
    duration,
}: {
    animation: SquaddieMoveOnMapAnimation
    dateSpy: MockInstance
    expectedCoordinate: ScreenLocation
    duration: number
}) => {
    SquaddieMoveOnMapAnimationService.update(animation)
    dateSpy.mockReturnValue(duration)
    SquaddieMoveOnMapAnimationService.update(animation)

    const actualCoordinate =
        SquaddieMoveOnMapAnimationService.getScreenSquaddieScreenLocation(
            animation
        )

    expect(actualCoordinate.x).toEqual(expectedCoordinate.x)
    expect(actualCoordinate.y).toEqual(expectedCoordinate.y)
    return true
}
