import { Label, LabelService } from "../../../ui/label"
import { RectArea, RectAreaService } from "../../../ui/rectArea"
import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"
import { WINDOW_SPACING } from "../../../ui/constants"

const dieLayout = {
    textBoxMargin: [WINDOW_SPACING.SPACING1, 0, 0, WINDOW_SPACING.SPACING1 + 3],
    fontSize: 24,
    fontColor: [10, 10, 10],
    cornerRadius: [2, 2, 2, 2],
    fillColor: [0, 0, 100, 220],
    leftOffsetFromDrawArea: 20,
    marginFromPreviousDie: 30,
    height: 36,
    width: 36,
}

export interface IndividualDieAnimation {
    numberToShow: number
    label: Label
}
export const IndividualDieAnimationService = {
    new: ({
        result,
        dieIndex,
        drawArea,
    }: {
        result: number
        dieIndex: number
        drawArea: RectArea
    }): IndividualDieAnimation => {
        const label = LabelService.new({
            textBoxMargin: dieLayout.textBoxMargin,
            text: `${result}`,
            fontSize: dieLayout.fontSize,
            fontColor: dieLayout.fontColor,
            cornerRadius: dieLayout.cornerRadius,
            fillColor: dieLayout.fillColor,
            area: RectAreaService.new({
                left:
                    dieLayout.leftOffsetFromDrawArea +
                    RectAreaService.left(drawArea) +
                    (dieLayout.width + dieLayout.marginFromPreviousDie) *
                        dieIndex,
                bottom: RectAreaService.bottom(drawArea),
                height: dieLayout.height,
                width: dieLayout.width,
            }),
        })

        return {
            numberToShow: result,
            label,
        }
    },
    draw: ({
        individualDie,
        graphicsBuffer,
    }: {
        individualDie: IndividualDieAnimation
        graphicsBuffer: GraphicsBuffer
    }) => draw({ individualDie, graphicsBuffer }),
}

const draw = ({
    individualDie,
    graphicsBuffer,
}: {
    individualDie: IndividualDieAnimation
    graphicsBuffer: GraphicsBuffer
}) => {
    if (!individualDie?.label) return
    LabelService.draw(individualDie.label, graphicsBuffer)
}
