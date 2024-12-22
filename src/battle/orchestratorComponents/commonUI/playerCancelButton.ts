import { ScreenDimensions } from "../../../utils/graphics/graphicsConfig"
import {
    GOLDEN_RATIO,
    HORIZONTAL_ALIGN,
    VERTICAL_ALIGN,
} from "../../../ui/constants"
import { Label, LabelService } from "../../../ui/label"
import { RectAreaService } from "../../../ui/rectArea"

const layout = {
    startColumn: 6,
    endColumn: 6,
    text: "Cancel",
    fontSize: 16,
    height: (ScreenDimensions.SCREEN_WIDTH / 12) * (GOLDEN_RATIO - 1),
    fillColor: [0, 0, 64],
    strokeColor: [0, 0, 0],
    strokeWeight: 0,
    fontColor: [0, 0, 16],
    textBoxMargin: [0, 0, 0, 0],
    margin: 0,
}

export const PlayerCancelButtonService = {
    new: (): Label => {
        return LabelService.new({
            ...layout,
            area: RectAreaService.new({
                screenWidth: ScreenDimensions.SCREEN_WIDTH,
                startColumn: layout.startColumn,
                endColumn: layout.endColumn,
                margin: layout.margin,
                top: ScreenDimensions.SCREEN_HEIGHT - layout.height,
                height: layout.height,
            }),
            textSize: layout.fontSize,
            horizAlign: HORIZONTAL_ALIGN.CENTER,
            vertAlign: VERTICAL_ALIGN.CENTER,
        })
    },
}
