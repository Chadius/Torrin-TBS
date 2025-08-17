import { DegreeOfSuccess } from "../../calculator/actionCalculator/degreeOfSuccess"
import { Rectangle, RectangleService } from "../../../ui/rectangle/rectangle"
import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"
import { RectAreaService } from "../../../ui/rectArea"

export interface AttackRollThermometerSegment {
    degreeOfSuccess: DegreeOfSuccess
    minimum: number
    maximum: number
    drawnObjects: {
        meter: Rectangle
    }
}

const LayoutConstants = {
    strokeWeight: 1,
    strokeColor: [0, 0, 70],
    fillColorByDegreeOfSuccess: {
        [DegreeOfSuccess.CRITICAL_SUCCESS]: [48, 66, 48],
        [DegreeOfSuccess.SUCCESS]: [120, 43, 29],
        [DegreeOfSuccess.FAILURE]: [20, 79, 48],
        [DegreeOfSuccess.CRITICAL_FAILURE]: [0, 65, 29],
        [DegreeOfSuccess.NONE]: [0, 0, 70],
    },
}

export const AttackRollThermometerSegmentService = {
    new: ({
        degreeOfSuccess,
        minimum,
        maximum,
    }: {
        degreeOfSuccess: DegreeOfSuccess
        minimum: number
        maximum: number
    }): AttackRollThermometerSegment => {
        if (minimum == undefined || maximum == undefined)
            throw new Error(
                "[AttackRollThermometerSegmentService.new] minimum and maximum must be defined"
            )

        if (minimum > maximum)
            throw new Error(
                "[AttackRollThermometerSegmentService.new] minimum must be less than maximum"
            )

        return {
            degreeOfSuccess,
            minimum,
            maximum,
            drawnObjects: {
                meter: undefined,
            },
        }
    },
    drawMeter: ({
        segment,
        left,
        top,
        height,
        graphicsBuffer,
        widthPerValue,
        isLastSegment,
    }: {
        segment: AttackRollThermometerSegment
        left: number
        top: number
        height: number
        widthPerValue: number
        graphicsBuffer: GraphicsBuffer
        isLastSegment: boolean
    }) => {
        if (segment.drawnObjects.meter == undefined) {
            const numberOfValuesToSpan =
                segment.maximum - segment.minimum + (isLastSegment ? 0 : 1)
            segment.drawnObjects.meter = RectangleService.new({
                area: RectAreaService.new({
                    left,
                    top,
                    width: widthPerValue * numberOfValuesToSpan,
                    height,
                }),
                strokeColor: LayoutConstants.strokeColor,
                strokeWeight: LayoutConstants.strokeWeight,
                fillColor:
                    LayoutConstants.fillColorByDegreeOfSuccess[
                        segment.degreeOfSuccess
                    ],
            })
        }

        RectangleService.draw(segment.drawnObjects.meter, graphicsBuffer)
    },
}
