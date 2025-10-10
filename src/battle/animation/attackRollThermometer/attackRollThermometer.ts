import {
    DegreeOfSuccess,
    TDegreeOfSuccess,
} from "../../calculator/actionCalculator/degreeOfSuccess"
import { isValidValue } from "../../../utils/objectValidityCheck"
import { RollResultService } from "../../calculator/actionCalculator/rollResult"
import {
    AttackRollThermometerSegment,
    AttackRollThermometerSegmentService,
} from "./attackRollThermometerSegment"
import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"
import { Rectangle, RectangleService } from "../../../ui/rectangle/rectangle"
import { RectArea, RectAreaService } from "../../../ui/rectArea"
import {
    type CurveInterpolation,
    CurveInterpolationService,
} from "../../../../gitSubmodules/CurveInterpolation/src/curveInterpolation"
import { InterpolationTypeEnum } from "../../../../gitSubmodules/CurveInterpolation/src/interpolationType"

export interface AttackRollThermometer {
    segments: {
        [DegreeOfSuccess.NONE]?: AttackRollThermometerSegment
        [DegreeOfSuccess.CRITICAL_FAILURE]?: AttackRollThermometerSegment
        [DegreeOfSuccess.FAILURE]?: AttackRollThermometerSegment
        [DegreeOfSuccess.SUCCESS]?: AttackRollThermometerSegment
        [DegreeOfSuccess.CRITICAL_SUCCESS]?: AttackRollThermometerSegment
    }

    successBonus: number
    rolls: [number, number] | undefined
    degreeOfSuccess: TDegreeOfSuccess
    drawnObjects: {
        startAnimationTime: number | undefined
        progressBar: {
            rectangle: Rectangle | undefined
            initialFillWidthFormula: CurveInterpolation | undefined
            criticalFillWidthFormula: CurveInterpolation | undefined
        }
    }
    drawArea: RectArea
}

const LayoutConstants = {
    segments: {},
    thermometerProgressBar: {
        animationTimeForInitialFill: 1000,
        animationTimeForCriticalFill: 500,
        fillColor: [0, 0, 100, 96],
        cornerRadius: [8],
        strokeColor: [0, 0, 0],
        strokeWeight: 4,
        height: 16,
        easeIn: {
            realTime: 0.2,
            formulaTime: 0.5,
        },
        easeOut: {
            realTime: 0.2,
            formulaTime: 0.1,
        },
    },
}

export const AttackRollThermometerService = {
    ANIMATION_TIME_FOR_INITIAL_FILL:
        LayoutConstants.thermometerProgressBar.animationTimeForInitialFill,
    getMaximumProgressBarWidth: (thermometer: AttackRollThermometer): number =>
        getMaximumProgressBarWidth(thermometer),
    ANIMATION_TIME_FOR_CRITICAL_FILL:
        LayoutConstants.thermometerProgressBar.animationTimeForCriticalFill,
    new: ({
        tryToShowCriticalSuccess,
        tryToShowCriticalFailure,
        successBonus,
        drawArea,
    }: {
        tryToShowCriticalSuccess: boolean
        tryToShowCriticalFailure: boolean
        successBonus: number
        drawArea: RectArea
    }): AttackRollThermometer => {
        if (!isValidValue(successBonus)) {
            throw new Error(
                "[AttackRollThermometerService.new]: successBonus must be defined"
            )
        }

        const segmentsToMake = calculateDegreesOfSuccessToMakeSegments(
            successBonus,
            tryToShowCriticalSuccess,
            tryToShowCriticalFailure
        )

        const segments: {
            [DegreeOfSuccess.NONE]?: AttackRollThermometerSegment
            [DegreeOfSuccess.CRITICAL_FAILURE]?: AttackRollThermometerSegment
            [DegreeOfSuccess.FAILURE]?: AttackRollThermometerSegment
            [DegreeOfSuccess.SUCCESS]?: AttackRollThermometerSegment
            [DegreeOfSuccess.CRITICAL_SUCCESS]?: AttackRollThermometerSegment
        } = {}

        if (segmentsToMake.has(DegreeOfSuccess.CRITICAL_SUCCESS)) {
            segments[DegreeOfSuccess.CRITICAL_SUCCESS] =
                createCriticalSuccessSegment(successBonus)
        }

        if (segmentsToMake.has(DegreeOfSuccess.SUCCESS)) {
            segments[DegreeOfSuccess.SUCCESS] = createSuccessSegment(
                successBonus,
                tryToShowCriticalSuccess &&
                    segmentsToMake.has(DegreeOfSuccess.CRITICAL_SUCCESS)
            )
        }

        if (segmentsToMake.has(DegreeOfSuccess.FAILURE)) {
            segments[DegreeOfSuccess.FAILURE] = createFailureSegment(
                successBonus,
                tryToShowCriticalFailure &&
                    segmentsToMake.has(DegreeOfSuccess.CRITICAL_FAILURE)
            )
        }

        if (segmentsToMake.has(DegreeOfSuccess.CRITICAL_FAILURE)) {
            segments[DegreeOfSuccess.CRITICAL_FAILURE] =
                createCriticalFailureSegment(
                    successBonus,
                    segmentsToMake.has(DegreeOfSuccess.FAILURE)
                )
        }

        return {
            segments,
            successBonus,
            rolls: undefined,
            degreeOfSuccess: DegreeOfSuccess.NONE,
            drawnObjects: {
                startAnimationTime: undefined,
                progressBar: {
                    rectangle: undefined,
                    initialFillWidthFormula: undefined,
                    criticalFillWidthFormula: undefined,
                },
            },
            drawArea: drawArea,
        }
    },
    getDegreeOfSuccessSegments: (
        thermometer: AttackRollThermometer
    ): {
        [DegreeOfSuccess.NONE]?: AttackRollThermometerSegment
        [DegreeOfSuccess.CRITICAL_FAILURE]?: AttackRollThermometerSegment
        [DegreeOfSuccess.FAILURE]?: AttackRollThermometerSegment
        [DegreeOfSuccess.SUCCESS]?: AttackRollThermometerSegment
        [DegreeOfSuccess.CRITICAL_SUCCESS]?: AttackRollThermometerSegment
    } => {
        return thermometer.segments
    },
    beginRollingAnimation({
        thermometer,
        rolls,
        degreeOfSuccess,
    }: {
        thermometer: AttackRollThermometer
        rolls: [number, number]
        degreeOfSuccess: TDegreeOfSuccess
    }) {
        if (!isValidValue(thermometer)) {
            throw new Error(
                "[AttackRollThermometerService.beginRollingAnimation] thermometer must be defined"
            )
        }
        if (!isValidValue(rolls) || rolls.length < 2) {
            throw new Error(
                "[AttackRollThermometerService.beginRollingAnimation] rolls requires 2 numbers"
            )
        }
        if (!isValidValue(degreeOfSuccess)) {
            throw new Error(
                "[AttackRollThermometerService.beginRollingAnimation] degreeOfSuccess must be defined"
            )
        }
        if (degreeOfSuccess == DegreeOfSuccess.NONE) {
            throw new Error(
                "[AttackRollThermometerService.beginRollingAnimation] degreeOfSuccess cannot be DegreeOfSuccess.NONE"
            )
        }
        tryToStartTimer(thermometer)
        thermometer.rolls = [...rolls]
        thermometer.degreeOfSuccess = degreeOfSuccess
    },
    draw: ({
        thermometer,
        graphicsBuffer,
    }: {
        thermometer: AttackRollThermometer | undefined
        graphicsBuffer: GraphicsBuffer
    }) => {
        if (!isValidValue(thermometer) || thermometer == undefined) return
        drawSegments({ thermometer, graphicsBuffer })
        drawProgressBar({
            thermometer,
            graphicsBuffer,
        })
    },
}

const calculateDegreesOfSuccessToMakeSegments = (
    successBonus: number,
    tryToShowCriticalSuccess: boolean,
    tryToShowCriticalFailure: boolean
) => {
    const degreesOfSuccessBasedOnSuccessBonus = new Set(
        RollResultService.getPossibleDegreesOfSuccessBasedOnBonus(successBonus)
    )
    let degreesOfSuccessToMakeSegmentsOutOf: TDegreeOfSuccess[] = []
    if (degreesOfSuccessBasedOnSuccessBonus.has(DegreeOfSuccess.SUCCESS))
        degreesOfSuccessToMakeSegmentsOutOf.push(DegreeOfSuccess.SUCCESS)
    if (degreesOfSuccessBasedOnSuccessBonus.has(DegreeOfSuccess.FAILURE))
        degreesOfSuccessToMakeSegmentsOutOf.push(DegreeOfSuccess.FAILURE)
    if (
        degreesOfSuccessBasedOnSuccessBonus.has(
            DegreeOfSuccess.CRITICAL_SUCCESS
        )
    )
        degreesOfSuccessToMakeSegmentsOutOf.push(
            tryToShowCriticalSuccess
                ? DegreeOfSuccess.CRITICAL_SUCCESS
                : DegreeOfSuccess.SUCCESS
        )
    if (
        degreesOfSuccessBasedOnSuccessBonus.has(
            DegreeOfSuccess.CRITICAL_FAILURE
        )
    )
        degreesOfSuccessToMakeSegmentsOutOf.push(
            tryToShowCriticalFailure
                ? DegreeOfSuccess.CRITICAL_FAILURE
                : DegreeOfSuccess.FAILURE
        )
    return new Set(degreesOfSuccessToMakeSegmentsOutOf)
}

const createSuccessSegment = (
    successBonus: number,
    tryToShowCriticalSuccess: boolean
): AttackRollThermometerSegment => {
    let minimum = 0 - successBonus
    let maximum = 5 - successBonus + (tryToShowCriticalSuccess ? 0 : 1)
    return AttackRollThermometerSegmentService.new({
        degreeOfSuccess: DegreeOfSuccess.SUCCESS,
        minimum,
        maximum,
    })
}

const createFailureSegment = (
    successBonus: number,
    tryToShowCriticalFailure: boolean
): AttackRollThermometerSegment => {
    let minimum = tryToShowCriticalFailure
        ? -RollResultService.DIE_SIZE + 1 - successBonus
        : 0
    let maximum = -1 - successBonus
    return AttackRollThermometerSegmentService.new({
        degreeOfSuccess: DegreeOfSuccess.FAILURE,
        minimum,
        maximum,
    })
}

const createCriticalSuccessSegment = (
    successBonus: number
): AttackRollThermometerSegment => {
    let minimum = RollResultService.DIE_SIZE - successBonus
    let maximum = 18
    return AttackRollThermometerSegmentService.new({
        degreeOfSuccess: DegreeOfSuccess.CRITICAL_SUCCESS,
        minimum,
        maximum,
    })
}

const createCriticalFailureSegment = (
    successBonus: number,
    tryToShowFailure: boolean
): AttackRollThermometerSegment => {
    let minimum = 1 + 1 - RollResultService.DIE_SIZE
    let maximum = tryToShowFailure
        ? 0 - successBonus - RollResultService.DIE_SIZE
        : -1 - successBonus
    return AttackRollThermometerSegmentService.new({
        degreeOfSuccess: DegreeOfSuccess.CRITICAL_FAILURE,
        minimum,
        maximum,
    })
}

const tryToStartTimer = (thermometer: AttackRollThermometer) => {
    if (thermometer.drawnObjects.startAnimationTime == undefined)
        thermometer.drawnObjects.startAnimationTime = Date.now()
}

const drawProgressBar = ({
    thermometer,
    graphicsBuffer,
}: {
    thermometer: AttackRollThermometer
    graphicsBuffer: GraphicsBuffer
}) => {
    if (
        !isValidValue(thermometer?.drawnObjects?.startAnimationTime) ||
        thermometer.drawnObjects.startAnimationTime == undefined
    )
        return

    if (thermometer.drawnObjects.progressBar.rectangle == undefined) {
        thermometer.drawnObjects.progressBar.rectangle = RectangleService.new({
            area: RectAreaService.new({
                left: RectAreaService.left(thermometer.drawArea),
                width: 0,
                centerY: RectAreaService.centerY(thermometer.drawArea),
                height: LayoutConstants.thermometerProgressBar.height,
            }),
            cornerRadius: LayoutConstants.thermometerProgressBar.cornerRadius,
            strokeColor: LayoutConstants.thermometerProgressBar.strokeColor,
            strokeWeight: LayoutConstants.thermometerProgressBar.strokeWeight,
            fillColor: LayoutConstants.thermometerProgressBar.fillColor,
        })

        thermometer.drawnObjects.progressBar.initialFillWidthFormula =
            createWidthFormulaForInitialFill(thermometer)
        thermometer.drawnObjects.progressBar.criticalFillWidthFormula =
            createWidthFormulaForCriticalFill(thermometer)
    }

    let timeElapsed = Date.now() - thermometer.drawnObjects.startAnimationTime
    const initialWidth = thermometer.drawnObjects.progressBar
        .initialFillWidthFormula
        ? CurveInterpolationService.calculate(
              thermometer.drawnObjects.progressBar.initialFillWidthFormula,
              timeElapsed
          )
        : 0

    let criticalWidth = 0
    if (
        thermometer.drawnObjects.progressBar.criticalFillWidthFormula &&
        timeElapsed >
            LayoutConstants.thermometerProgressBar.animationTimeForInitialFill
    ) {
        criticalWidth = CurveInterpolationService.calculate(
            thermometer.drawnObjects.progressBar.criticalFillWidthFormula,
            timeElapsed
        )
        if (thermometer.degreeOfSuccess == DegreeOfSuccess.CRITICAL_FAILURE)
            criticalWidth *= -1
    }
    thermometer.drawnObjects.progressBar.rectangle.area =
        RectAreaService.withWidth(
            thermometer.drawnObjects.progressBar.rectangle.area,
            initialWidth + criticalWidth
        )
    RectangleService.draw(
        thermometer.drawnObjects.progressBar.rectangle,
        graphicsBuffer
    )
}

const drawSegments = ({
    thermometer,
    graphicsBuffer,
}: {
    thermometer: AttackRollThermometer
    graphicsBuffer: GraphicsBuffer
}) => {
    const segmentsToDraw = [
        thermometer.segments[DegreeOfSuccess.CRITICAL_FAILURE],
        thermometer.segments[DegreeOfSuccess.FAILURE],
        thermometer.segments[DegreeOfSuccess.SUCCESS],
        thermometer.segments[DegreeOfSuccess.CRITICAL_SUCCESS],
    ].filter((x) => x != undefined)

    let left = RectAreaService.left(thermometer.drawArea)
    segmentsToDraw.forEach((segment, index) => {
        AttackRollThermometerSegmentService.drawMeter({
            segment,
            graphicsBuffer,
            left,
            height: RectAreaService.height(thermometer.drawArea),
            top: RectAreaService.top(thermometer.drawArea),
            widthPerValue:
                getMaximumProgressBarWidth(thermometer) /
                (getMaximumValue(thermometer) - getMinimumValue(thermometer)),
            isLastSegment: index == segmentsToDraw.length - 1,
        })

        left =
            segment.drawnObjects.meter != undefined
                ? RectAreaService.right(segment.drawnObjects.meter.area) + 1
                : 0
    })
}

const getMinimumValue = (thermometer: AttackRollThermometer): number => {
    switch (true) {
        case !!thermometer.segments[DegreeOfSuccess.CRITICAL_FAILURE]:
            // @ts-ignore
            return thermometer.segments[DegreeOfSuccess.CRITICAL_FAILURE]
                .minimum
        case !!thermometer.segments[DegreeOfSuccess.FAILURE]:
            // @ts-ignore
            return thermometer.segments[DegreeOfSuccess.FAILURE].minimum
        case !!thermometer.segments[DegreeOfSuccess.SUCCESS]:
            // @ts-ignore
            return thermometer.segments[DegreeOfSuccess.SUCCESS].minimum
        case !!thermometer.segments[DegreeOfSuccess.CRITICAL_SUCCESS]:
            // @ts-ignore
            return thermometer.segments[DegreeOfSuccess.CRITICAL_SUCCESS]
                .minimum
        default:
            throw new Error(
                "[AttackRollThermometer.getMinimumValue] No segments found"
            )
    }
}

const getMaximumValue = (thermometer: AttackRollThermometer): number => {
    switch (true) {
        case !!thermometer.segments[DegreeOfSuccess.CRITICAL_SUCCESS]:
            // @ts-ignore
            return thermometer.segments[DegreeOfSuccess.CRITICAL_SUCCESS]
                .maximum
        case !!thermometer.segments[DegreeOfSuccess.SUCCESS]:
            // @ts-ignore
            return thermometer.segments[DegreeOfSuccess.SUCCESS].maximum
        case !!thermometer.segments[DegreeOfSuccess.FAILURE]:
            // @ts-ignore
            return thermometer.segments[DegreeOfSuccess.FAILURE].maximum
        case !!thermometer.segments[DegreeOfSuccess.CRITICAL_FAILURE]:
            // @ts-ignore
            return thermometer.segments[DegreeOfSuccess.CRITICAL_FAILURE]
                .maximum
        default:
            throw new Error(
                "[AttackRollThermometer.getMaximumValue] No segments found"
            )
    }
}

const calculateCriticalWidthOfProgressBar = (
    thermometer: AttackRollThermometer
) => {
    const widthRatio =
        RollResultService.DIE_SIZE /
        (getMaximumValue(thermometer) - getMinimumValue(thermometer))
    return getMaximumProgressBarWidth(thermometer) * widthRatio
}

const calculateFillFinalWidthOfProgressBarBasedOnValue = (
    thermometer: AttackRollThermometer,
    valueToDisplay: number
) => {
    const minimumValue = getMinimumValue(thermometer)
    const maximumValue = getMaximumValue(thermometer)
    const widthRatio =
        (valueToDisplay - minimumValue) / (maximumValue - minimumValue)
    return getMaximumProgressBarWidth(thermometer) * widthRatio
}

const calculateInitialFillFinalWidthOfProgressBar = (
    thermometer: AttackRollThermometer
): number => {
    if (thermometer?.rolls == undefined) return 0
    const valueToDisplay = thermometer.rolls[0] + thermometer.rolls[1]
    return calculateFillFinalWidthOfProgressBarBasedOnValue(
        thermometer,
        valueToDisplay
    )
}

const getMaximumProgressBarWidth = (
    thermometer: AttackRollThermometer
): number => {
    return RectAreaService.width(thermometer.drawArea)
}

const createWidthFormulaForInitialFill = (
    thermometer: AttackRollThermometer
): CurveInterpolation | undefined => {
    const startPoint: [number, number] = [0, 0]
    const initialFillEndWidth =
        calculateInitialFillFinalWidthOfProgressBar(thermometer)

    const endPoint: [number, number] = [
        LayoutConstants.thermometerProgressBar.animationTimeForInitialFill,
        initialFillEndWidth,
    ]

    const easeOut = isRollACritical(thermometer)
        ? undefined
        : {
              realTime:
                  LayoutConstants.thermometerProgressBar
                      .animationTimeForInitialFill *
                  LayoutConstants.thermometerProgressBar.easeOut.realTime,
              formulaTime:
                  LayoutConstants.thermometerProgressBar
                      .animationTimeForInitialFill *
                  LayoutConstants.thermometerProgressBar.easeOut.formulaTime,
          }

    return CurveInterpolationService.new({
        formulaSettings: {
            type: InterpolationTypeEnum.LINEAR,
            startPoint,
            endPoint,
        },
        easeIn: {
            realTime:
                LayoutConstants.thermometerProgressBar
                    .animationTimeForInitialFill *
                LayoutConstants.thermometerProgressBar.easeIn.realTime,
            formulaTime:
                LayoutConstants.thermometerProgressBar
                    .animationTimeForInitialFill *
                LayoutConstants.thermometerProgressBar.easeIn.formulaTime,
        },
        easeOut,
    })
}

const isRollACritical = (thermometer: AttackRollThermometer) => {
    return new Set<TDegreeOfSuccess>([
        DegreeOfSuccess.CRITICAL_FAILURE,
        DegreeOfSuccess.CRITICAL_SUCCESS,
    ]).has(thermometer.degreeOfSuccess)
}

const createWidthFormulaForCriticalFill = (
    thermometer: AttackRollThermometer
): CurveInterpolation | undefined => {
    if (!isRollACritical(thermometer)) return undefined

    const initialFillEndWidth =
        calculateInitialFillFinalWidthOfProgressBar(thermometer)
    const startPoint: [number, number] = [
        LayoutConstants.thermometerProgressBar.animationTimeForInitialFill,
        0,
    ]

    let rollWidth = calculateCriticalWidthOfProgressBar(thermometer)

    if (thermometer.degreeOfSuccess == DegreeOfSuccess.CRITICAL_SUCCESS)
        rollWidth = Math.min(
            rollWidth,
            getMaximumProgressBarWidth(thermometer) - initialFillEndWidth
        )
    else rollWidth = Math.max(rollWidth, initialFillEndWidth)

    const totalAnimationTimeForFill =
        LayoutConstants.thermometerProgressBar.animationTimeForInitialFill +
        LayoutConstants.thermometerProgressBar.animationTimeForCriticalFill
    const endPoint: [number, number] = [totalAnimationTimeForFill, rollWidth]

    return CurveInterpolationService.new({
        formulaSettings: {
            type: InterpolationTypeEnum.LINEAR,
            startPoint,
            endPoint,
        },
        easeOut: {
            realTime:
                totalAnimationTimeForFill *
                LayoutConstants.thermometerProgressBar.easeOut.realTime,
            formulaTime:
                totalAnimationTimeForFill *
                LayoutConstants.thermometerProgressBar.easeOut.formulaTime,
        },
    })
}
