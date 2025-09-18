import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import {
    AttackRollThermometer,
    AttackRollThermometerService,
} from "./attackRollThermometer"
import {
    DegreeOfSuccess,
    TDegreeOfSuccess,
} from "../../calculator/actionCalculator/degreeOfSuccess"
import {
    MockedGraphicsBufferService,
    MockedP5GraphicsBuffer,
} from "../../../utils/test/mocks"
import { RectArea, RectAreaService } from "../../../ui/rectArea"
import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"

describe("Attack Roll Thermometer", () => {
    let dateSpy: MockInstance

    beforeEach(() => {
        dateSpy = vi.spyOn(Date, "now").mockReturnValue(0)
    })

    afterEach(() => {
        dateSpy.mockRestore()
    })

    it("throws an error if fields are undefined", () => {
        const shouldThrowError = () => {
            createAttackRollThermometer({
                tryToShowCriticalFailure: true,
                tryToShowCriticalSuccess: false,
                // @ts-ignore intentionally throwing an error
                successBonus: undefined,
            })
        }

        expect(shouldThrowError).toThrow("defined")
    })

    describe("creates thermometer segments", () => {
        type CreateAndCompareTest = {
            name: string
            tryToShowCriticalSuccess: boolean
            tryToShowCriticalFailure: boolean
            successBonus: number
            expectedSegmentLimits: {
                [DegreeOfSuccess.NONE]?: { minimum: number; maximum: number }
                [DegreeOfSuccess.CRITICAL_FAILURE]?: {
                    minimum: number
                    maximum: number
                }
                [DegreeOfSuccess.FAILURE]?: { minimum: number; maximum: number }
                [DegreeOfSuccess.SUCCESS]?: { minimum: number; maximum: number }
                [DegreeOfSuccess.CRITICAL_SUCCESS]?: {
                    minimum: number
                    maximum: number
                }
            }
        }

        let tests: CreateAndCompareTest[] = [
            {
                name: "Failure to Success",
                tryToShowCriticalSuccess: false,
                tryToShowCriticalFailure: false,
                successBonus: -7,
                expectedSegmentLimits: {
                    [DegreeOfSuccess.FAILURE]: { minimum: 0, maximum: 6 },
                    [DegreeOfSuccess.SUCCESS]: { minimum: 7, maximum: 13 },
                },
            },
            {
                name: "Failure is not possible, Critical Failure exists",
                tryToShowCriticalSuccess: false,
                tryToShowCriticalFailure: true,
                successBonus: -3,
                expectedSegmentLimits: {
                    [DegreeOfSuccess.CRITICAL_FAILURE]: {
                        minimum: -4,
                        maximum: 2,
                    },
                    [DegreeOfSuccess.SUCCESS]: { minimum: 3, maximum: 9 },
                },
            },
            {
                name: "Critical Failure is not possible",
                tryToShowCriticalSuccess: false,
                tryToShowCriticalFailure: true,
                successBonus: -2,
                expectedSegmentLimits: {
                    [DegreeOfSuccess.FAILURE]: {
                        minimum: 0,
                        maximum: 1,
                    },
                    [DegreeOfSuccess.SUCCESS]: { minimum: 2, maximum: 8 },
                },
            },
            {
                name: "Critical Success is not possible",
                tryToShowCriticalSuccess: true,
                tryToShowCriticalFailure: false,
                successBonus: -13,
                expectedSegmentLimits: {
                    [DegreeOfSuccess.FAILURE]: {
                        minimum: 0,
                        maximum: 12,
                    },
                    [DegreeOfSuccess.SUCCESS]: { minimum: 13, maximum: 19 },
                },
            },
            {
                name: "Success is not possible",
                tryToShowCriticalSuccess: true,
                tryToShowCriticalFailure: false,
                successBonus: -19,
                expectedSegmentLimits: {
                    [DegreeOfSuccess.FAILURE]: {
                        minimum: 0,
                        maximum: 18,
                    },
                },
            },
            {
                name: "All Degrees of Success are possible",
                tryToShowCriticalSuccess: true,
                tryToShowCriticalFailure: true,
                successBonus: -7,
                expectedSegmentLimits: {
                    [DegreeOfSuccess.CRITICAL_FAILURE]: {
                        minimum: -4,
                        maximum: 1,
                    },
                    [DegreeOfSuccess.FAILURE]: {
                        minimum: 2,
                        maximum: 6,
                    },
                    [DegreeOfSuccess.SUCCESS]: {
                        minimum: 7,
                        maximum: 12,
                    },
                    [DegreeOfSuccess.CRITICAL_SUCCESS]: {
                        minimum: 13,
                        maximum: 18,
                    },
                },
            },
        ]

        it.each(tests)(
            "$name",
            ({
                tryToShowCriticalFailure,
                tryToShowCriticalSuccess,
                successBonus,
                expectedSegmentLimits,
            }) => {
                const thermometer = createAttackRollThermometer({
                    tryToShowCriticalFailure,
                    tryToShowCriticalSuccess,
                    successBonus,
                })

                const degreeOfSuccessSegments =
                    AttackRollThermometerService.getDegreeOfSuccessSegments(
                        thermometer
                    )
                expect(Object.keys(degreeOfSuccessSegments)).toHaveLength(
                    Object.keys(expectedSegmentLimits).length
                )

                const extractedMinimum = Object.fromEntries(
                    Object.values(degreeOfSuccessSegments).map((segment) => {
                        return [
                            segment.degreeOfSuccess,
                            {
                                minimum: segment.minimum,
                                maximum: segment.maximum,
                            },
                        ]
                    })
                )
                expect(extractedMinimum).toEqual(
                    expect.objectContaining(expectedSegmentLimits)
                )
            }
        )
    })

    const drawProgressFirstTime = ({
        timeElapsedRatioForFirstFill,
        rolls,
        thermometer,
        graphicsBuffer,
        degreeOfSuccess,
    }: {
        timeElapsedRatioForFirstFill: number
        rolls: [number, number]
        thermometer: AttackRollThermometer
        graphicsBuffer: GraphicsBuffer
        degreeOfSuccess: TDegreeOfSuccess
    }) => {
        dateSpy.mockReturnValue(0)
        AttackRollThermometerService.beginRollingAnimation({
            thermometer,
            rolls,
            degreeOfSuccess,
        })

        dateSpy.mockReturnValue(
            timeElapsedRatioForFirstFill *
                AttackRollThermometerService.ANIMATION_TIME_FOR_INITIAL_FILL
        )
        AttackRollThermometerService.draw({
            thermometer,
            graphicsBuffer,
        })
    }

    describe("progress meter draws over time", () => {
        let thermometer: AttackRollThermometer
        let graphicsBuffer: MockedP5GraphicsBuffer
        let graphicsSpies: { [key: string]: MockInstance }

        type DrawTestCase = {
            name: string
            timeElapsedRatioForFirstFill: number
            rolls: [number, number]
            expectedFillLengthRatio: number
        }

        beforeEach(() => {
            graphicsBuffer = new MockedP5GraphicsBuffer()
            graphicsSpies = MockedGraphicsBufferService.addSpies(graphicsBuffer)
            thermometer = createAttackRollThermometer({
                tryToShowCriticalFailure: true,
                tryToShowCriticalSuccess: true,
                successBonus: -7,
            })
        })

        it("throws an error if thermometer is undefined", () => {
            const shouldThrowErrorUndefined = () => {
                AttackRollThermometerService.beginRollingAnimation({
                    // @ts-ignore intentionally throwing an error
                    thermometer: undefined,
                    rolls: [6, 1],
                    degreeOfSuccess: DegreeOfSuccess.SUCCESS,
                })
            }
            expect(shouldThrowErrorUndefined).toThrowError(
                "thermometer must be defined"
            )
        })

        it("throws an error if degree of success is undefined or NONE", () => {
            const shouldThrowErrorUndefined = () => {
                AttackRollThermometerService.beginRollingAnimation({
                    thermometer,
                    rolls: [6, 1],
                    // @ts-ignore intentionally throwing an error
                    degreeOfSuccess: undefined,
                })
            }
            expect(shouldThrowErrorUndefined).toThrowError("degreeOfSuccess")

            const shouldThrowErrorNotNone = () => {
                AttackRollThermometerService.beginRollingAnimation({
                    thermometer,
                    rolls: [6, 1],
                    degreeOfSuccess: DegreeOfSuccess.NONE,
                })
            }
            expect(shouldThrowErrorNotNone).toThrowError("degreeOfSuccess")
        })

        it("throws an error if roll is invalid when animated", () => {
            const shouldThrowErrorUndefined = () => {
                AttackRollThermometerService.beginRollingAnimation({
                    thermometer,
                    // @ts-ignore intentionally throwing an error
                    rolls: undefined,
                    degreeOfSuccess: DegreeOfSuccess.SUCCESS,
                })
            }
            expect(shouldThrowErrorUndefined).toThrowError(
                "rolls requires 2 numbers"
            )

            const shouldThrowErrorNotEnoughNumbers = () => {
                AttackRollThermometerService.beginRollingAnimation({
                    thermometer,
                    // @ts-ignore test has invalid input to make sure the code throws an error
                    rolls: [],
                })
            }
            expect(shouldThrowErrorNotEnoughNumbers).toThrowError(
                "rolls requires 2 numbers"
            )
        })

        const progressBarTests: DrawTestCase[] = [
            {
                name: "initial should have a 0 length bar when it starts animating",
                timeElapsedRatioForFirstFill: 0,
                rolls: [6, 1],
                expectedFillLengthRatio: 0,
            },
            {
                name: "should fill animation bar at end of animation time",
                timeElapsedRatioForFirstFill: 1.0,
                rolls: [6, 1],
                expectedFillLengthRatio: (7 - -4) / (18 - -4),
            },
        ]

        it.each(progressBarTests)(
            "$name",
            ({
                timeElapsedRatioForFirstFill,
                rolls,
                expectedFillLengthRatio,
            }) => {
                drawProgressFirstTime({
                    rolls,
                    timeElapsedRatioForFirstFill,
                    thermometer,
                    graphicsBuffer,
                    degreeOfSuccess: DegreeOfSuccess.SUCCESS,
                })

                const rectangleWidths = getRectangleWidthParametersFromMock(
                    graphicsSpies["rect"]
                )
                expect(
                    areSomeWidthsCloseEnough(
                        rectangleWidths,
                        expectedFillLengthRatio *
                            AttackRollThermometerService.getMaximumProgressBarWidth(
                                thermometer
                            )
                    )
                ).toBeTruthy()
                expect(dateSpy).toHaveBeenCalled()
            }
        )

        describe("drawing background segments", () => {
            let segmentRectangles: {
                [DegreeOfSuccess.CRITICAL_FAILURE]: RectArea
                [DegreeOfSuccess.FAILURE]: RectArea
                [DegreeOfSuccess.SUCCESS]: RectArea
                [DegreeOfSuccess.CRITICAL_SUCCESS]: RectArea
            }

            beforeEach(() => {
                AttackRollThermometerService.draw({
                    thermometer,
                    graphicsBuffer,
                })

                segmentRectangles = {
                    // @ts-ignore It's not undefined
                    [DegreeOfSuccess.CRITICAL_FAILURE]:
                        // @ts-ignore It's not undefined
                        thermometer.segments[DegreeOfSuccess.CRITICAL_FAILURE]
                            .drawnObjects.meter.area,
                    // @ts-ignore It's not undefined
                    [DegreeOfSuccess.FAILURE]:
                        // @ts-ignore It's not undefined
                        thermometer.segments[DegreeOfSuccess.FAILURE]
                            .drawnObjects.meter.area,
                    // @ts-ignore It's not undefined
                    [DegreeOfSuccess.SUCCESS]:
                        // @ts-ignore It's not undefined
                        thermometer.segments[DegreeOfSuccess.SUCCESS]
                            .drawnObjects.meter.area,
                    // @ts-ignore It's not undefined
                    [DegreeOfSuccess.CRITICAL_SUCCESS]:
                        // @ts-ignore It's not undefined
                        thermometer.segments[DegreeOfSuccess.CRITICAL_SUCCESS]
                            .drawnObjects.meter.area,
                }
            })

            it("segments are horizontally drawn from critical failure to critical success", () => {
                expect(
                    RectAreaService.left(
                        segmentRectangles[DegreeOfSuccess.CRITICAL_FAILURE]
                    )
                ).toBeLessThan(
                    RectAreaService.left(
                        segmentRectangles[DegreeOfSuccess.FAILURE]
                    )
                )

                expect(
                    RectAreaService.left(
                        segmentRectangles[DegreeOfSuccess.FAILURE]
                    )
                ).toBeLessThan(
                    RectAreaService.left(
                        segmentRectangles[DegreeOfSuccess.SUCCESS]
                    )
                )

                expect(
                    RectAreaService.left(
                        segmentRectangles[DegreeOfSuccess.SUCCESS]
                    )
                ).toBeLessThan(
                    RectAreaService.left(
                        segmentRectangles[DegreeOfSuccess.CRITICAL_SUCCESS]
                    )
                )
            })
        })
    })

    describe("progress meter moves after critical roll and the first fill passes", () => {
        let thermometer: AttackRollThermometer
        let graphicsBuffer: MockedP5GraphicsBuffer
        let graphicsSpies: { [key: string]: MockInstance }

        const drawProgressForCritical = ({
            timeElapsedRatioForCriticalFill,
            thermometer,
            graphicsBuffer,
        }: {
            timeElapsedRatioForCriticalFill: number
            thermometer: AttackRollThermometer
            graphicsBuffer: GraphicsBuffer
        }) => {
            dateSpy.mockReturnValue(
                AttackRollThermometerService.ANIMATION_TIME_FOR_INITIAL_FILL +
                    timeElapsedRatioForCriticalFill *
                        AttackRollThermometerService.ANIMATION_TIME_FOR_CRITICAL_FILL
            )
            AttackRollThermometerService.draw({
                thermometer,
                graphicsBuffer,
            })
        }

        beforeEach(() => {
            graphicsBuffer = new MockedP5GraphicsBuffer()
            graphicsSpies = MockedGraphicsBufferService.addSpies(graphicsBuffer)
            thermometer = createAttackRollThermometer({
                tryToShowCriticalFailure: true,
                tryToShowCriticalSuccess: true,
                successBonus: -7,
            })
        })

        it("will start the progress bar at the initial size", () => {
            drawProgressFirstTime({
                rolls: [6, 6],
                timeElapsedRatioForFirstFill: 1.0,
                thermometer,
                graphicsBuffer,
                degreeOfSuccess: DegreeOfSuccess.CRITICAL_SUCCESS,
            })

            drawProgressForCritical({
                timeElapsedRatioForCriticalFill: 0,
                thermometer,
                graphicsBuffer,
            })

            const rectangleWidths = getRectangleWidthParametersFromMock(
                graphicsSpies["rect"]
            )
            expect(
                areSomeWidthsCloseEnough(
                    rectangleWidths,
                    (AttackRollThermometerService.getMaximumProgressBarWidth(
                        thermometer
                    ) *
                        (12 - -4)) /
                        (18 - -4)
                )
            ).toBeTruthy()
        })

        it("will expand the progress bar if you roll max", () => {
            drawProgressFirstTime({
                rolls: [6, 6],
                timeElapsedRatioForFirstFill: 1.0,
                thermometer,
                graphicsBuffer,
                degreeOfSuccess: DegreeOfSuccess.CRITICAL_SUCCESS,
            })

            drawProgressForCritical({
                timeElapsedRatioForCriticalFill: 1.0,
                thermometer,
                graphicsBuffer,
            })

            const rectangleWidths = getRectangleWidthParametersFromMock(
                graphicsSpies["rect"]
            )
            expect(
                areSomeWidthsCloseEnough(
                    rectangleWidths,
                    AttackRollThermometerService.getMaximumProgressBarWidth(
                        thermometer
                    )
                )
            ).toBeTruthy()
        })

        it("will shrink the progress bar if you roll a botch", () => {
            drawProgressFirstTime({
                rolls: [1, 1],
                timeElapsedRatioForFirstFill: 1.0,
                thermometer,
                graphicsBuffer,
                degreeOfSuccess: DegreeOfSuccess.CRITICAL_FAILURE,
            })

            drawProgressForCritical({
                timeElapsedRatioForCriticalFill: 1.0,
                thermometer,
                graphicsBuffer,
            })

            const rectangleWidths = getRectangleWidthParametersFromMock(
                graphicsSpies["rect"]
            )
            expect(areSomeWidthsCloseEnough(rectangleWidths, 0)).toBeTruthy()
        })
    })
})

const createAttackRollThermometer = ({
    tryToShowCriticalFailure,
    tryToShowCriticalSuccess,
    successBonus,
}: {
    tryToShowCriticalFailure: boolean
    tryToShowCriticalSuccess: boolean
    successBonus: number
}): AttackRollThermometer => {
    return AttackRollThermometerService.new({
        tryToShowCriticalFailure,
        tryToShowCriticalSuccess,
        successBonus: successBonus,
        drawArea: RectAreaService.new({
            left: 0,
            top: 0,
            width: 1280,
            height: 768,
        }),
    })
}

const getRectangleWidthParametersFromMock = (
    widthMock: MockInstance
): number[] => widthMock.mock.calls.map((args) => args[2])

const areSomeWidthsCloseEnough = (
    widths: number[],
    expectedWidth: number
): boolean =>
    widths.length > 0 &&
    widths.some((width) => Math.abs(expectedWidth - width) < 2)
